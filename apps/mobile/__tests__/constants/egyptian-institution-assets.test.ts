import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getSelectableEgyptianInstitutions } from "@monyvi/logic";

import {
  DEFAULT_EGYPTIAN_INSTITUTION_ASSETS,
  EGYPTIAN_INSTITUTION_ASSETS,
  getEgyptianInstitutionAsset,
} from "../../constants/egyptian-institution-assets";

interface RasterDimensions {
  readonly width: number;
  readonly height: number;
}

const MAX_RUNTIME_LOGO_DIMENSION_PX = 512;
const RASTER_LOGO_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const INSTITUTION_ASSET_ROOT = path.resolve(
  __dirname,
  "../../assets/institutions"
);

function listRasterLogoFiles(directory: string): readonly string[] {
  const files: string[] = [];

  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const itemPath = path.join(directory, item.name);
    if (item.isDirectory()) {
      files.push(...listRasterLogoFiles(itemPath));
      continue;
    }

    if (RASTER_LOGO_EXTENSIONS.has(path.extname(item.name).toLowerCase())) {
      files.push(itemPath);
    }
  }

  return files;
}

function readPngDimensions(buffer: Buffer): RasterDimensions | null {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): RasterDimensions | null {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readRasterDimensions(filePath: string): RasterDimensions {
  const buffer = readFileSync(filePath);
  const dimensions = readPngDimensions(buffer) ?? readJpegDimensions(buffer);

  if (!dimensions) {
    throw new Error(`Unsupported raster logo format: ${filePath}`);
  }

  return dimensions;
}

describe("Egyptian institution assets", () => {
  it("has local logo coverage for every selectable provider", () => {
    const selectableProviders = [
      ...getSelectableEgyptianInstitutions("bank"),
      ...getSelectableEgyptianInstitutions("wallet"),
    ];

    for (const provider of selectableProviders) {
      const asset = EGYPTIAN_INSTITUTION_ASSETS[provider.id];

      expect(asset.institutionId).toBe(provider.id);
      expect(asset.kind).toBe(provider.type);
      expect(asset.logo).toBeTruthy();
      expect(asset.logo.format).toBeTruthy();
      expect(asset.logo.source).not.toBe(
        DEFAULT_EGYPTIAN_INSTITUTION_ASSETS[provider.type].logo.source
      );
    }
  });

  it("does not define local logo assets for non-selectable providers", () => {
    const selectableIds = new Set(
      [
        ...getSelectableEgyptianInstitutions("bank"),
        ...getSelectableEgyptianInstitutions("wallet"),
      ].map((provider) => provider.id)
    );

    for (const institutionId of Object.keys(EGYPTIAN_INSTITUTION_ASSETS)) {
      expect(
        selectableIds.has(
          institutionId as Parameters<typeof selectableIds.has>[0]
        )
      ).toBe(true);
    }
  });

  it("provides default assets for manual bank and wallet providers", () => {
    expect(DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.bank.logo).toBeTruthy();
    expect(DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.wallet.logo).toBeTruthy();
    expect(getEgyptianInstitutionAsset(null, "bank")).toBe(
      DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.bank
    );
    expect(getEgyptianInstitutionAsset(null, "wallet")).toBe(
      DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.wallet
    );
  });

  it("keeps bundled raster logos downsampled for mobile runtime slots", () => {
    const oversizedFiles = listRasterLogoFiles(INSTITUTION_ASSET_ROOT).filter(
      (filePath) => {
        const dimensions = readRasterDimensions(filePath);

        return (
          Math.max(dimensions.width, dimensions.height) >
          MAX_RUNTIME_LOGO_DIMENSION_PX
        );
      }
    );

    expect(oversizedFiles).toEqual([]);
  });
});
