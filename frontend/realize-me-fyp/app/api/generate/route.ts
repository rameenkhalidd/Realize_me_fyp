import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerIdTokenFromRequest } from '@/lib/firebase/admin';

const BACKEND_BASE_URL = process.env.REALIZEME_BACKEND_URL?.replace(/\/$/, '');

function toDataUrl(bytes: ArrayBuffer, mimeType: string) {
    const base64 = Buffer.from(bytes).toString('base64');
    return `data:${mimeType};base64,${base64}`;
}

type ParsedMultipart = {
    sketchFile: File;
    colorHintsFile: File | null;
    previewFile: File | null;
    previewDataUrl: string;
    sketch_json: string | null;
};

type ParsedJson = {
    dataUrl: string;
    sketch_json: null;
};

function fileFromForm(formData: FormData, ...keys: string[]): File | null {
    for (const key of keys) {
        const value = formData.get(key);
        if (value instanceof File && value.size > 0) {
            return value;
        }
    }
    return null;
}

async function parseSketchRequest(req: NextRequest): Promise<ParsedMultipart | ParsedJson | { error: string }> {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const sketchField = formData.get('sketch_json');

        const sketchFile =
            fileFromForm(formData, 'sketch_file', 'file') ??
            (() => {
                const legacy = formData.get('file');
                return legacy instanceof File ? legacy : null;
            })();

        if (!sketchFile) {
            return { error: 'No sketch file provided' } as const;
        }

        const colorHintsFile = fileFromForm(formData, 'color_hints_file');
        const previewFile = fileFromForm(formData, 'preview_file');
        const previewSource = previewFile ?? sketchFile;

        const sketch_json = typeof sketchField === 'string' ? sketchField : null;
        const previewBuffer = await previewSource.arrayBuffer();

        return {
            sketchFile,
            colorHintsFile,
            previewFile,
            previewDataUrl: toDataUrl(previewBuffer, previewSource.type || 'image/png'),
            sketch_json,
        };
    }

    const body = await req.json();

    if (!body?.sketch || typeof body.sketch !== 'string') {
        return { error: 'Missing or invalid sketch field' } as const;
    }

    return {
        dataUrl: body.sketch,
        sketch_json: null,
    };
}

async function proxySessionGenerate(
    sketchFile: File,
    colorHintsFile: File | null,
    previewFile: File | null,
    sketchJson: string | null,
    authHeader: string
) {
    const backendForm = new FormData();
    backendForm.append('file', sketchFile, sketchFile.name || 'sketch.png');
    backendForm.append('sketch_file', sketchFile, sketchFile.name || 'sketch.png');
    if (colorHintsFile) {
        backendForm.append('color_hints_file', colorHintsFile, colorHintsFile.name || 'color_hints.png');
    }
    if (previewFile) {
        backendForm.append('preview_file', previewFile, previewFile.name || 'preview.png');
    }
    if (sketchJson) {
        backendForm.append('sketch_json', sketchJson);
    }

    return fetch(`${BACKEND_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
            Authorization: authHeader,
        },
        body: backendForm,
    });
}

async function proxyGeneration(sketchFile: File) {
    const backendForm = new FormData();
    backendForm.append('file', sketchFile, sketchFile.name || 'sketch.png');

    const response = await fetch(`${BACKEND_BASE_URL}/generate-image`, {
        method: 'POST',
        body: backendForm,
    });

    if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
    }

    return response.json();
}

/** Insert history row when only /generate-image ran (session /api/generate failed or was skipped). */
async function recordHistoryAfterGenerateImage(
    authHeader: string,
    imageBase64: string,
    sketchJson: string
): Promise<{ history_id?: number; generated_image_url?: string; session_id?: string } | null> {
    if (!BACKEND_BASE_URL) {
        return null;
    }
    try {
        const buf = Buffer.from(imageBase64, 'base64');
        const form = new FormData();
        form.append('generated_image', new Blob([buf], { type: 'image/png' }), 'generated.png');
        form.append('sketch_json', sketchJson);
        const res = await fetch(`${BACKEND_BASE_URL}/api/history/record`, {
            method: 'POST',
            headers: { Authorization: authHeader },
            body: form,
        });
        if (!res.ok) {
            const t = await res.text();
            console.warn('POST /api/history/record failed:', res.status, t);
            return null;
        }
        return (await res.json()) as {
            history_id?: number;
            generated_image_url?: string;
            session_id?: string;
        };
    } catch (e) {
        console.error('recordHistoryAfterGenerateImage:', e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        try {
            const decoded = await verifyBearerIdTokenFromRequest(req);
            console.info('Generate API authorized for uid:', decoded.uid);
        } catch (authError) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    details: authError instanceof Error ? authError.message : 'Invalid or missing token',
                },
                { status: 401 }
            );
        }

        const parsedRequest = await parseSketchRequest(req);

        if ('error' in parsedRequest) {
            return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
        }

        const authHeader = req.headers.get('authorization') ?? '';
        const previewDataUrl =
            'previewDataUrl' in parsedRequest ? parsedRequest.previewDataUrl : parsedRequest.dataUrl;

        if (BACKEND_BASE_URL && 'sketchFile' in parsedRequest && parsedRequest.sketchFile) {
            try {
                const sessionRes = await proxySessionGenerate(
                    parsedRequest.sketchFile,
                    parsedRequest.colorHintsFile,
                    parsedRequest.previewFile,
                    parsedRequest.sketch_json,
                    authHeader
                );
                if (sessionRes.ok) {
                    const proxied = await sessionRes.json();
                    const generatedImage =
                        proxied.generatedImage ||
                        (typeof proxied.image_base64 === 'string'
                            ? `data:image/png;base64,${proxied.image_base64}`
                            : null);

                    if (generatedImage) {
                        return NextResponse.json({
                            ...proxied,
                            generatedImage,
                            success: proxied.success ?? true,
                            history_id: proxied.history_id,
                            generated_image_url: proxied.generated_image_url,
                            session_id: proxied.session_id,
                        });
                    }
                } else {
                    const errText = await sessionRes.text();
                    console.warn('Session /api/generate failed, trying /generate-image:', sessionRes.status, errText);
                }
            } catch (error) {
                console.error('Session generate error, falling back:', error);
            }

            try {
                const proxied = await proxyGeneration(parsedRequest.sketchFile);
                const b64 =
                    typeof proxied.image_base64 === 'string' ? proxied.image_base64 : undefined;
                const generatedImage =
                    proxied.generatedImage ||
                    (b64 ? `data:image/png;base64,${b64}` : null);

                if (generatedImage) {
                    let historyId: number | undefined = proxied.history_id;
                    let imageUrl: string | undefined = proxied.generated_image_url;
                    let sessionId: string | undefined = proxied.session_id;

                    const sketchJson =
                        'sketch_json' in parsedRequest ? parsedRequest.sketch_json : null;
                    if (b64 && sketchJson && authHeader) {
                        const rec = await recordHistoryAfterGenerateImage(
                            authHeader,
                            b64,
                            sketchJson
                        );
                        if (rec?.history_id != null) {
                            historyId = rec.history_id;
                            imageUrl = rec.generated_image_url ?? imageUrl;
                            sessionId = rec.session_id ?? sessionId;
                        }
                    }

                    return NextResponse.json({
                        ...proxied,
                        generatedImage,
                        success: proxied.success ?? true,
                        history_id: historyId,
                        generated_image_url: imageUrl,
                        session_id: sessionId,
                    });
                }
            } catch (error) {
                console.error('Generation proxy failed, using mock fallback:', error);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        return NextResponse.json({
            generatedImage: previewDataUrl,
            success: true,
            message: BACKEND_BASE_URL
                ? 'We couldn’t complete the full AI render on our servers just now. Your sketch (with color hints) is on the left; the right panel shows a temporary preview until ControlNet + color processing is connected.'
                : 'Preview: your sketch is shown in both panels until the full render pipeline is connected.',
            mode: 'mock',
        });
    } catch (error) {
        console.error('Generation API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate image',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Generate API is running',
        mode: BACKEND_BASE_URL ? 'proxy' : 'mock',
        backendConfigured: Boolean(BACKEND_BASE_URL),
    });
}
