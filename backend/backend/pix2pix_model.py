import torch
import torch.nn as nn


# ─────────────────────────────────────────────
# Blocks
# ─────────────────────────────────────────────

class DownBlock(nn.Module):
    def __init__(self, in_c, out_c, normalize=True):
        super().__init__()
        layers = [nn.Conv2d(in_c, out_c, 4, 2, 1, bias=False)]
        if normalize:
            layers.append(nn.BatchNorm2d(out_c))
        layers.append(nn.LeakyReLU(0.2, inplace=True))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class UpBlock(nn.Module):
    def __init__(self, in_c, out_c):
        super().__init__()
        self.net = nn.Sequential(
            nn.ConvTranspose2d(in_c, out_c, 4, 2, 1, bias=False),
            nn.BatchNorm2d(out_c),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


# ─────────────────────────────────────────────
# Generator (TRUE Pix2Pix U-Net)
# ─────────────────────────────────────────────

class Generator(nn.Module):
    def __init__(self):
        super().__init__()

        # Encoder
        self.d1 = DownBlock(3, 64, normalize=False)
        self.d2 = DownBlock(64, 128)
        self.d3 = DownBlock(128, 256)
        self.d4 = DownBlock(256, 512)
        self.d5 = DownBlock(512, 512)
        self.d6 = DownBlock(512, 512)
        self.d7 = DownBlock(512, 512)

        # Bottleneck
        self.bottleneck = nn.Sequential(
            nn.Conv2d(512, 512, 4, 2, 1),
            nn.ReLU()
        )

        # Decoder (skip connections → doubled channels)
        self.u1 = UpBlock(512, 512)
        self.u2 = UpBlock(1024, 512)
        self.u3 = UpBlock(1024, 512)
        self.u4 = UpBlock(1024, 512)
        self.u5 = UpBlock(1024, 256)
        self.u6 = UpBlock(512, 128)
        self.u7 = UpBlock(256, 64)

        self.final = nn.Sequential(
            nn.ConvTranspose2d(128, 3, 4, 2, 1),
            nn.Tanh()
        )

    def forward(self, x):
        d1 = self.d1(x)
        d2 = self.d2(d1)
        d3 = self.d3(d2)
        d4 = self.d4(d3)
        d5 = self.d5(d4)
        d6 = self.d6(d5)
        d7 = self.d7(d6)

        b = self.bottleneck(d7)

        u1 = self.u1(b)
        u1 = torch.cat([u1, d7], dim=1)

        u2 = self.u2(u1)
        u2 = torch.cat([u2, d6], dim=1)

        u3 = self.u3(u2)
        u3 = torch.cat([u3, d5], dim=1)

        u4 = self.u4(u3)
        u4 = torch.cat([u4, d4], dim=1)

        u5 = self.u5(u4)
        u5 = torch.cat([u5, d3], dim=1)

        u6 = self.u6(u5)
        u6 = torch.cat([u6, d2], dim=1)

        u7 = self.u7(u6)
        u7 = torch.cat([u7, d1], dim=1)

        return self.final(u7)