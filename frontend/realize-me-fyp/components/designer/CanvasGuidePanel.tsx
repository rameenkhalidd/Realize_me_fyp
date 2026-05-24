import Link from 'next/link';
import { Brush, PenTool, Palette, ImageIcon, FolderInput, Sparkles, LogIn, Wand2 } from 'lucide-react';

type CanvasGuideVariant = 'full' | 'guest';

type CanvasGuidePanelProps = {
    variant?: CanvasGuideVariant;
};

export default function CanvasGuidePanel({ variant = 'full' }: CanvasGuidePanelProps) {
    if (variant === 'guest') {
        return (
            <div className="font-roboto h-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
                <h2 className="font-raleway text-lg font-semibold text-gray-900 md:text-xl">Try the sketch canvas</h2>
                <p className="mt-0.5 text-xs text-gray-500 md:text-sm">
                    You&apos;re on a guest preview — draw freely. Sign in for AI generation and your full workspace.
                </p>

                <ol className="mt-5 space-y-3 md:mt-6 md:space-y-3.5">
                    <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                        <div className="flex gap-2.5 md:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-700 md:h-9 md:w-9 md:rounded-lg">
                                <Brush className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <h3 className="font-raleway text-sm font-semibold text-gray-900">1. Tools</h3>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                    Bottom bar: move, draw, erase, and shapes. Top left: import and export files.
                                </p>
                            </div>
                        </div>
                    </li>

                    <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                        <div className="flex gap-2.5 md:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 md:h-9 md:w-9 md:rounded-lg">
                                <PenTool className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <h3 className="font-raleway text-sm font-semibold text-gray-900">2. Draw</h3>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                    Use <strong className="text-gray-800">Draw</strong> or a shape tool and sketch your idea.
                                </p>
                            </div>
                        </div>
                    </li>

                    <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                        <div className="flex gap-2.5 md:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700 md:h-9 md:w-9 md:rounded-lg">
                                <Palette className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <h3 className="font-raleway text-sm font-semibold text-gray-900">3. Style</h3>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                    Use the style controls on the canvas edge for color, stroke, brush size, and opacity — the
                                    same basics as the full workspace.
                                </p>
                            </div>
                        </div>
                    </li>

                    <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                        <div className="flex gap-2.5 md:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 md:h-9 md:w-9 md:rounded-lg">
                                <LogIn className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <h3 className="font-raleway text-sm font-semibold text-gray-900">4. Unlock the full app</h3>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                    <strong className="text-gray-800">AI generation</strong>, results, and saved workflow are
                                    for signed-in users. Use{' '}
                                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
                                        Sign in to generate
                                    </span>{' '}
                                    in the toolbar or{' '}
                                    <Link href="/login?next=%2Fdesigner" className="font-medium text-violet-700 underline-offset-2 hover:underline">
                                        log in here
                                    </Link>
                                    .
                                </p>
                            </div>
                        </div>
                    </li>

                    <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                        <div className="flex gap-2.5 md:gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pink-100 text-pink-700 md:h-9 md:w-9 md:rounded-lg">
                                <ImageIcon className="h-4 w-4" aria-hidden />
                            </div>
                            <div>
                                <h3 className="font-raleway text-sm font-semibold text-gray-900">Bring in an image</h3>
                                <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                    Use{' '}
                                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                        <FolderInput className="h-3.5 w-3.5 shrink-0 text-gray-700" aria-hidden />
                                        Import
                                    </span>{' '}
                                    top left to add a reference — same limits as the full app apply.
                                </p>
                            </div>
                        </div>
                    </li>
                </ol>
            </div>
        );
    }

    return (
        <div className="font-roboto h-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-raleway text-lg font-semibold text-gray-900 md:text-xl">
                Quick guide
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 md:text-sm">Five steps to get going.</p>

            <ol className="mt-5 space-y-3 md:mt-6 md:space-y-3.5">
                <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                    <div className="flex gap-2.5 md:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-700 md:h-9 md:w-9 md:rounded-lg">
                            <Brush className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h3 className="font-raleway text-sm font-semibold text-gray-900">1. Tools</h3>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                Bottom bar: move, draw, erase, and shapes. Top left: files in and
                                out.
                            </p>
                        </div>
                    </div>
                </li>

                <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                    <div className="flex gap-2.5 md:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 md:h-9 md:w-9 md:rounded-lg">
                            <PenTool className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h3 className="font-raleway text-sm font-semibold text-gray-900">2. Draw</h3>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                Use <strong className="text-gray-800">Draw</strong> or a shape tool.
                                Sketch your garment on the canvas.
                            </p>
                        </div>
                    </div>
                </li>

                <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                    <div className="flex gap-2.5 md:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-700 md:h-9 md:w-9 md:rounded-lg">
                            <Palette className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h3 className="font-raleway text-sm font-semibold text-gray-900">3. Style</h3>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                Right panel: color, stroke, brush size, opacity.
                            </p>
                        </div>
                    </div>
                </li>

                <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                    <div className="flex gap-2.5 md:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pink-100 text-pink-700 md:h-9 md:w-9 md:rounded-lg">
                            <ImageIcon className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h3 className="font-raleway text-sm font-semibold text-gray-900">
                                4. Already have a sketch?
                            </h3>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                If you drew it elsewhere, bring it in with{' '}
                                <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                    <FolderInput className="h-3.5 w-3.5 shrink-0 text-gray-700" aria-hidden />
                                    Import
                                </span>{' '}
                                top left. It sits on the canvas like your own lines, so keep editing
                                or press{' '}
                                <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
                                    Generate
                                </span>{' '}
                                when you are ready.
                            </p>
                        </div>
                    </div>
                </li>

                <li className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 md:px-4">
                    <div className="flex gap-2.5 md:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700 md:h-9 md:w-9 md:rounded-lg">
                            <Wand2 className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h3 className="font-raleway text-sm font-semibold text-gray-900">
                                5. Generate image
                            </h3>
                            <p className="mt-0.5 text-sm leading-snug text-gray-600">
                                When your sketch is done, press{' '}
                                <strong className="text-gray-800">Generate</strong> in the bottom
                                toolbar. That sends your sketch to generation.
                            </p>
                        </div>
                    </div>
                </li>
            </ol>
        </div>
    );
}
