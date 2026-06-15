import type { SelectableEgyptianInstitutionId } from "@monyvi/logic";
import type { ComponentType } from "react";
import type { ImageSourcePropType } from "react-native";
import type { SvgProps } from "react-native-svg";

import AaibLogo from "../assets/institutions/banks/aaib.png";
import AbkEgyptLogo from "../assets/institutions/banks/abk-egypt.svg";
import AdcbEgyptLogo from "../assets/institutions/banks/adcb-egypt.svg";
import AdibEgyptLogo from "../assets/institutions/banks/adib-egypt.png";
import AgriculturalBankOfEgyptLogo from "../assets/institutions/banks/agricultural-bank-of-egypt.png";
import AlBarakaEgyptLogo from "../assets/institutions/banks/al-baraka-egypt.svg";
import AlexbankLogo from "../assets/institutions/banks/alexbank.jpg";
import ArabBankLogo from "../assets/institutions/banks/arab-bank.svg";
import ArabInternationalBankLogo from "../assets/institutions/banks/arab-international-bank.jpg";
import AttijariwafaBankEgyptLogo from "../assets/institutions/banks/attijariwafa-bank-egypt.jpg";
import BankAbcLogo from "../assets/institutions/banks/bank-abc.jpg";
import BankNxtLogo from "../assets/institutions/banks/bank-nxt.jpg";
import BanqueDuCaireLogo from "../assets/institutions/banks/banque-du-caire.jpg";
import BanqueMisrLogo from "../assets/institutions/banks/banque-misr.png";
import CibLogo from "../assets/institutions/banks/cib.png";
import CitibankEgyptLogo from "../assets/institutions/banks/citibank-egypt.svg";
import CreditAgricoleEgyptCompactLogo from "../assets/institutions/banks/credit-agricole-egypt-compact.png";
import CreditAgricoleEgyptLogo from "../assets/institutions/banks/credit-agricole-egypt.svg";
import EdbEgyptLogo from "../assets/institutions/banks/edb-egypt.jpg";
import EgBankLogo from "../assets/institutions/banks/eg-bank.png";
import EgyptianArabLandBankLogo from "../assets/institutions/banks/egyptian-arab-land-bank.png";
import EmiratesNbdEgyptLogo from "../assets/institutions/banks/emirates-nbd-egypt.png";
import FabMisrLogo from "../assets/institutions/banks/fab-misr.svg";
import FaisalIslamicBankEgyptLogo from "../assets/institutions/banks/faisal-islamic-bank-egypt.svg";
import HdbEgyptLogo from "../assets/institutions/banks/hdb-egypt.png";
import HsbcEgyptLogo from "../assets/institutions/banks/hsbc-egypt.svg";
import IndustrialDevelopmentBankLogo from "../assets/institutions/banks/industrial-development-bank.jpg";
import KfhEgyptLogo from "../assets/institutions/banks/kfh-egypt.jpg";
import AaibMark from "../assets/institutions/banks/marks/compact/aaib-mark-compact.png";
import AbkEgyptMark from "../assets/institutions/banks/marks/compact/abk-egypt-mark-compact.png";
import AdcbEgyptMark from "../assets/institutions/banks/marks/compact/adcb-egypt-mark-compact.png";
import AdibEgyptMark from "../assets/institutions/banks/marks/compact/adib-egypt-mark-compact.png";
import AgriculturalBankOfEgyptMark from "../assets/institutions/banks/marks/compact/agricultural-bank-of-egypt-mark-compact.png";
import AlBarakaEgyptMark from "../assets/institutions/banks/marks/compact/al-baraka-egypt-mark-compact.png";
import AlexbankMark from "../assets/institutions/banks/marks/compact/alexbank-mark-compact.png";
import ArabBankMark from "../assets/institutions/banks/marks/compact/arab-bank-mark-compact.png";
import AttijariwafaBankEgyptMark from "../assets/institutions/banks/marks/compact/attijariwafa-bank-egypt-mark-compact.png";
import BankAbcMark from "../assets/institutions/banks/marks/compact/bank-abc-mark-compact.png";
import BankNxtMark from "../assets/institutions/banks/marks/compact/bank-nxt-mark-compact.png";
import BanqueDuCaireMark from "../assets/institutions/banks/marks/compact/banque-du-caire-mark-compact.png";
import BanqueMisrMark from "../assets/institutions/banks/marks/compact/banque-misr-mark-compact.png";
import EdbEgyptMark from "../assets/institutions/banks/marks/compact/edb-egypt-mark-compact.png";
import EgyptianArabLandBankMark from "../assets/institutions/banks/marks/compact/egyptian-arab-land-bank-mark-compact.png";
import EmiratesNbdEgyptMark from "../assets/institutions/banks/marks/compact/emirates-nbd-egypt-mark-compact.png";
import FabMisrMark from "../assets/institutions/banks/marks/compact/fab-misr-mark-compact.png";
import HdbEgyptMark from "../assets/institutions/banks/marks/compact/hdb-egypt-mark-compact.png";
import HsbcEgyptMark from "../assets/institutions/banks/marks/compact/hsbc-egypt-mark-compact.png";
import IndustrialDevelopmentBankMark from "../assets/institutions/banks/marks/compact/industrial-development-bank-mark-compact.png";
import KfhEgyptMark from "../assets/institutions/banks/marks/compact/kfh-egypt-mark-compact.png";
import MashreqEgyptMark from "../assets/institutions/banks/marks/compact/mashreq-egypt-mark-compact.png";
import MidbankMark from "../assets/institutions/banks/marks/compact/midbank-mark-compact.png";
import NbeMark from "../assets/institutions/banks/marks/compact/nbe-mark-compact.png";
import SaibMark from "../assets/institutions/banks/marks/compact/saib-mark-compact.png";
import StandardCharteredMark from "../assets/institutions/banks/marks/compact/standard-chartered-mark-compact.png";
import SuezCanalBankMark from "../assets/institutions/banks/marks/compact/suez-canal-bank-mark-compact.png";
import TheUnitedBankMark from "../assets/institutions/banks/marks/compact/the-united-bank-mark-compact.png";
import MashreqEgyptLogo from "../assets/institutions/banks/mashreq-egypt.jpg";
import MidbankLogo from "../assets/institutions/banks/midbank.jpg";
import NasserSocialBankLogo from "../assets/institutions/banks/nasser-social-bank.png";
import NbeLogo from "../assets/institutions/banks/nbe.png";
import NbkEgyptLogo from "../assets/institutions/banks/nbk-egypt.jpg";
import QnbEgyptLogo from "../assets/institutions/banks/qnb-egypt.png";
import SaibLogo from "../assets/institutions/banks/saib.png";
import StandardCharteredLogo from "../assets/institutions/banks/standard-chartered.svg";
import SuezCanalBankLogo from "../assets/institutions/banks/suez-canal-bank.png";
import TheUnitedBankLogo from "../assets/institutions/banks/the-united-bank.png";
import DefaultBankLogo from "../assets/institutions/defaults/bank.svg";
import DefaultWalletLogo from "../assets/institutions/defaults/wallet.svg";
import EAndCashLogo from "../assets/institutions/wallets/e-and-cash.webp";
import OrangeCashLogo from "../assets/institutions/wallets/orange-cash.svg";
import VodafoneCashLogo from "../assets/institutions/wallets/vodafone-cash.svg";
import WePayLogo from "../assets/institutions/wallets/we-pay.webp";
import { palette } from "./colors";

type EgyptianInstitutionAssetKind = "bank" | "wallet";

interface InstitutionLogoPresentation {
  readonly appLogoViewport?: "standard" | "inset" | "square" | "wide";
  readonly previewLogoViewport?:
    | "standard"
    | "inset"
    | "safeInset"
    | "safeSquare"
    | "square"
    | "wide";
  readonly cardAccentColor?: string;
  readonly cardAccentColorByMode?: {
    readonly light: string;
    readonly dark: string;
  };
  readonly cardGradientByMode?: {
    readonly light: readonly [string, string];
    readonly dark: readonly [string, string];
  };
  readonly cardLabelColorByMode?: {
    readonly light: string;
    readonly dark: string;
  };
  readonly needsContrastSurface?: boolean;
  readonly needsDarkSurface?: boolean;
  readonly needsDarkModeLightSurface?: boolean;
  readonly needsLightModeDarkSurface?: boolean;
  readonly needsColoredCardSurface?: boolean;
  readonly rowImageResizeMode?: "contain" | "cover";
  readonly rowImageViewport?: "standard" | "inset";
  readonly rowSvgViewport?: "standard" | "full" | "inset";
}

export type InstitutionLogo =
  | {
      readonly format: "svg";
      readonly source: ComponentType<SvgProps>;
      readonly appSource?: ImageSourcePropType;
      readonly presentation?: InstitutionLogoPresentation;
    }
  | {
      readonly format: "image";
      readonly source: ImageSourcePropType;
      readonly appSource?: ImageSourcePropType;
      readonly presentation?: InstitutionLogoPresentation;
    };

export interface EgyptianInstitutionAsset {
  readonly institutionId: SelectableEgyptianInstitutionId;
  readonly kind: EgyptianInstitutionAssetKind;
  readonly logo: InstitutionLogo;
}

const COLORED_CARD_SURFACE_LOGO = {
  needsColoredCardSurface: true,
} as const;
const DARK_MODE_LIGHT_AND_COLORED_CARD_SURFACE_LOGO = {
  needsDarkModeLightSurface: true,
  needsColoredCardSurface: true,
} as const;
const COVER_ROW_IMAGE_LOGO = { rowImageResizeMode: "cover" } as const;
const CONTRAST_INSET_ROW_IMAGE_LOGO = {
  needsDarkModeLightSurface: true,
  needsColoredCardSurface: true,
  rowImageViewport: "inset",
} as const;
const COLORED_CARD_INSET_ROW_SVG_LOGO = {
  needsColoredCardSurface: true,
  rowSvgViewport: "inset",
} as const;
const CONTRAST_INSET_ROW_SVG_LOGO = {
  needsContrastSurface: true,
  rowSvgViewport: "inset",
} as const;
function withCardAccent(
  presentation: InstitutionLogoPresentation | undefined,
  cardAccentColor: string,
  darkCardAccentColor: string = getDefaultDarkCardAccentColor(cardAccentColor)
): InstitutionLogoPresentation {
  return {
    ...presentation,
    cardAccentColor,
    cardAccentColorByMode: {
      light: cardAccentColor,
      dark: darkCardAccentColor,
    },
    cardGradientByMode: {
      light: [cardAccentColor, palette.slate[800]],
      dark: [darkCardAccentColor, palette.slate[950]],
    },
    cardLabelColorByMode: {
      light: cardAccentColor,
      dark: darkCardAccentColor,
    },
  };
}

function getDefaultDarkCardAccentColor(cardAccentColor: string): string {
  switch (cardAccentColor) {
    case palette.blue[600]:
      return palette.blue[500];
    case palette.gold[600]:
      return palette.gold[500];
    case palette.nileGreen[700]:
      return palette.nileGreen[500];
    case palette.orange[600]:
      return palette.orange[500];
    case palette.red[600]:
      return palette.red[500];
    case palette.violet[700]:
      return palette.violet[500];
    case palette.slate[700]:
      return palette.slate[500];
    default:
      return cardAccentColor;
  }
}

function withAppLogoInset(
  presentation: InstitutionLogoPresentation | undefined
): InstitutionLogoPresentation {
  return { ...presentation, appLogoViewport: "inset" };
}

function withAppLogoWide(
  presentation: InstitutionLogoPresentation | undefined
): InstitutionLogoPresentation {
  return { ...presentation, appLogoViewport: "wide" };
}

function withAppLogoSquare(
  presentation: InstitutionLogoPresentation | undefined
): InstitutionLogoPresentation {
  return { ...presentation, appLogoViewport: "square" };
}

function withPreviewLogoSafeInset(
  presentation: InstitutionLogoPresentation | undefined
): InstitutionLogoPresentation {
  return { ...presentation, previewLogoViewport: "safeInset" };
}

function withPreviewLogoSafeSquare(
  presentation: InstitutionLogoPresentation | undefined
): InstitutionLogoPresentation {
  return { ...presentation, previewLogoViewport: "safeSquare" };
}

function svgLogo(
  source: ComponentType<SvgProps>,
  presentation?: InstitutionLogoPresentation,
  appSource?: ImageSourcePropType
): InstitutionLogo {
  if (presentation && appSource) {
    return { format: "svg", source, presentation, appSource };
  }

  if (appSource) {
    return { format: "svg", source, appSource };
  }

  if (presentation) {
    return { format: "svg", source, presentation };
  }

  return { format: "svg", source };
}

function imageLogo(
  source: ImageSourcePropType,
  presentation?: InstitutionLogoPresentation,
  appSource?: ImageSourcePropType
): InstitutionLogo {
  if (presentation && appSource) {
    return { format: "image", source, presentation, appSource };
  }

  if (appSource) {
    return { format: "image", source, appSource };
  }

  if (presentation) {
    return { format: "image", source, presentation };
  }

  return { format: "image", source };
}

function bankAsset(
  institutionId: SelectableEgyptianInstitutionId,
  logo: InstitutionLogo = svgLogo(DefaultBankLogo)
): EgyptianInstitutionAsset {
  return { institutionId, kind: "bank", logo };
}

function walletAsset(
  institutionId: SelectableEgyptianInstitutionId,
  logo: InstitutionLogo = svgLogo(DefaultWalletLogo)
): EgyptianInstitutionAsset {
  return { institutionId, kind: "wallet", logo };
}

export const DEFAULT_EGYPTIAN_INSTITUTION_ASSETS = {
  bank: {
    institutionId: "manual-bank",
    kind: "bank",
    logo: svgLogo(DefaultBankLogo, withAppLogoSquare(undefined)),
  },
  wallet: {
    institutionId: "manual-wallet",
    kind: "wallet",
    logo: svgLogo(DefaultWalletLogo, withAppLogoSquare(undefined)),
  },
} as const;

export const EGYPTIAN_INSTITUTION_ASSETS = {
  "adcb-egypt": bankAsset(
    "adcb-egypt",
    svgLogo(
      AdcbEgyptLogo,
      withCardAccent(
        withAppLogoSquare(DARK_MODE_LIGHT_AND_COLORED_CARD_SURFACE_LOGO),
        palette.red[600],
        palette.red[500]
      ),
      AdcbEgyptMark
    )
  ),
  "adib-egypt": bankAsset(
    "adib-egypt",
    imageLogo(
      AdibEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      AdibEgyptMark
    )
  ),
  "agricultural-bank-of-egypt": bankAsset(
    "agricultural-bank-of-egypt",
    imageLogo(
      AgriculturalBankOfEgyptLogo,
      withCardAccent(
        withAppLogoSquare(COLORED_CARD_SURFACE_LOGO),
        palette.gold[800],
        palette.gold[600]
      ),
      AgriculturalBankOfEgyptMark
    )
  ),
  "abk-egypt": bankAsset(
    "abk-egypt",
    svgLogo(
      AbkEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      AbkEgyptMark
    )
  ),
  "al-baraka-egypt": bankAsset(
    "al-baraka-egypt",
    svgLogo(
      AlBarakaEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.red[600],
        palette.red[500]
      ),
      AlBarakaEgyptMark
    )
  ),
  aaib: bankAsset(
    "aaib",
    imageLogo(
      AaibLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.gold[800],
        palette.gold[600]
      ),
      AaibMark
    )
  ),
  "arab-bank": bankAsset(
    "arab-bank",
    svgLogo(
      ArabBankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      ArabBankMark
    )
  ),
  "arab-international-bank": bankAsset(
    "arab-international-bank",
    imageLogo(
      ArabInternationalBankLogo,
      withCardAccent(
        withAppLogoWide(COLORED_CARD_SURFACE_LOGO),
        palette.gold[800],
        palette.gold[600]
      ),
      ArabInternationalBankLogo
    )
  ),
  "attijariwafa-bank-egypt": bankAsset(
    "attijariwafa-bank-egypt",
    imageLogo(
      AttijariwafaBankEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.gold[800],
        palette.orange[500]
      ),
      AttijariwafaBankEgyptMark
    )
  ),
  "bank-abc": bankAsset(
    "bank-abc",
    imageLogo(
      BankAbcLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[500]
      ),
      BankAbcMark
    )
  ),
  "bank-nxt": bankAsset(
    "bank-nxt",
    imageLogo(
      BankNxtLogo,
      withCardAccent(
        withAppLogoWide(undefined),
        palette.slate[700],
        palette.slate[500]
      ),
      BankNxtMark
    )
  ),
  alexbank: bankAsset(
    "alexbank",
    imageLogo(
      AlexbankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.gold[800],
        palette.orange[500]
      ),
      AlexbankMark
    )
  ),
  "banque-du-caire": bankAsset(
    "banque-du-caire",
    imageLogo(
      BanqueDuCaireLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.orange[600],
        palette.orange[500]
      ),
      BanqueDuCaireMark
    )
  ),
  "banque-misr": bankAsset(
    "banque-misr",
    imageLogo(
      BanqueMisrLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.red[600],
        palette.red[500]
      ),
      BanqueMisrMark
    )
  ),
  "citibank-egypt": bankAsset(
    "citibank-egypt",
    svgLogo(
      CitibankEgyptLogo,
      withCardAccent(
        COLORED_CARD_INSET_ROW_SVG_LOGO,
        palette.blue[900],
        palette.red[500]
      )
    )
  ),
  cib: bankAsset(
    "cib",
    imageLogo(
      CibLogo,
      withCardAccent(
        COLORED_CARD_SURFACE_LOGO,
        palette.gold[800],
        palette.blue[600]
      )
    )
  ),
  "credit-agricole-egypt": bankAsset(
    "credit-agricole-egypt",
    svgLogo(
      CreditAgricoleEgyptLogo,
      withCardAccent(
        withAppLogoInset(CONTRAST_INSET_ROW_SVG_LOGO),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      CreditAgricoleEgyptCompactLogo
    )
  ),
  "egyptian-arab-land-bank": bankAsset(
    "egyptian-arab-land-bank",
    imageLogo(
      EgyptianArabLandBankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.slate[700],
        palette.slate[500]
      ),
      EgyptianArabLandBankMark
    )
  ),
  "eg-bank": bankAsset(
    "eg-bank",
    imageLogo(
      EgBankLogo,
      withCardAccent(
        withPreviewLogoSafeSquare(withAppLogoSquare(undefined)),
        palette.red[600],
        palette.blue[600]
      )
    )
  ),
  "emirates-nbd-egypt": bankAsset(
    "emirates-nbd-egypt",
    imageLogo(
      EmiratesNbdEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      EmiratesNbdEgyptMark
    )
  ),
  "edb-egypt": bankAsset(
    "edb-egypt",
    imageLogo(
      EdbEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      EdbEgyptMark
    )
  ),
  "faisal-islamic-bank-egypt": bankAsset(
    "faisal-islamic-bank-egypt",
    svgLogo(
      FaisalIslamicBankEgyptLogo,
      withCardAccent(
        withPreviewLogoSafeInset(withAppLogoInset(CONTRAST_INSET_ROW_SVG_LOGO)),
        palette.nileGreen[800],
        palette.nileGreen[600]
      )
    )
  ),
  "fab-misr": bankAsset(
    "fab-misr",
    svgLogo(
      FabMisrLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      FabMisrMark
    )
  ),
  "hdb-egypt": bankAsset(
    "hdb-egypt",
    imageLogo(
      HdbEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      HdbEgyptMark
    )
  ),
  "hsbc-egypt": bankAsset(
    "hsbc-egypt",
    svgLogo(
      HsbcEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.red[600],
        palette.red[500]
      ),
      HsbcEgyptMark
    )
  ),
  "industrial-development-bank": bankAsset(
    "industrial-development-bank",
    imageLogo(
      IndustrialDevelopmentBankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      IndustrialDevelopmentBankMark
    )
  ),
  "kfh-egypt": bankAsset(
    "kfh-egypt",
    imageLogo(
      KfhEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      KfhEgyptMark
    )
  ),
  "mashreq-egypt": bankAsset(
    "mashreq-egypt",
    imageLogo(
      MashreqEgyptLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.orange[600],
        palette.red[500]
      ),
      MashreqEgyptMark
    )
  ),
  midbank: bankAsset(
    "midbank",
    imageLogo(
      MidbankLogo,
      withCardAccent(
        withAppLogoSquare(COLORED_CARD_SURFACE_LOGO),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      MidbankMark
    )
  ),
  "nasser-social-bank": bankAsset(
    "nasser-social-bank",
    imageLogo(
      NasserSocialBankLogo,
      withCardAccent(
        withAppLogoInset(DARK_MODE_LIGHT_AND_COLORED_CARD_SURFACE_LOGO),
        palette.slate[700],
        palette.slate[500]
      )
    )
  ),
  nbe: bankAsset(
    "nbe",
    imageLogo(
      NbeLogo,
      withCardAccent(
        withAppLogoSquare(COLORED_CARD_SURFACE_LOGO),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      NbeMark
    )
  ),
  "nbk-egypt": bankAsset(
    "nbk-egypt",
    imageLogo(
      NbkEgyptLogo,
      withCardAccent(COVER_ROW_IMAGE_LOGO, palette.blue[800], palette.blue[600])
    )
  ),
  "qnb-egypt": bankAsset(
    "qnb-egypt",
    imageLogo(
      QnbEgyptLogo,
      withCardAccent(
        CONTRAST_INSET_ROW_IMAGE_LOGO,
        palette.slate[700],
        palette.slate[500]
      )
    )
  ),
  saib: bankAsset(
    "saib",
    imageLogo(
      SaibLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.slate[700],
        palette.slate[500]
      ),
      SaibMark
    )
  ),
  "standard-chartered": bankAsset(
    "standard-chartered",
    svgLogo(
      StandardCharteredLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.nileGreen[700],
        palette.blue[600]
      ),
      StandardCharteredMark
    )
  ),
  "suez-canal-bank": bankAsset(
    "suez-canal-bank",
    imageLogo(
      SuezCanalBankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.blue[800],
        palette.blue[600]
      ),
      SuezCanalBankMark
    )
  ),
  "the-united-bank": bankAsset(
    "the-united-bank",
    imageLogo(
      TheUnitedBankLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.nileGreen[700],
        palette.nileGreen[500]
      ),
      TheUnitedBankMark
    )
  ),
  "vodafone-cash": walletAsset(
    "vodafone-cash",
    svgLogo(
      VodafoneCashLogo,
      withCardAccent(
        withPreviewLogoSafeInset(
          withAppLogoInset(DARK_MODE_LIGHT_AND_COLORED_CARD_SURFACE_LOGO)
        ),
        palette.red[600],
        palette.red[500]
      )
    )
  ),
  "e-and-cash": walletAsset(
    "e-and-cash",
    imageLogo(
      EAndCashLogo,
      withCardAccent(
        withAppLogoSquare(undefined),
        palette.red[600],
        palette.red[500]
      )
    )
  ),
  "orange-cash": walletAsset(
    "orange-cash",
    svgLogo(
      OrangeCashLogo,
      withCardAccent(
        withAppLogoSquare(COLORED_CARD_SURFACE_LOGO),
        palette.orange[600],
        palette.orange[500]
      )
    )
  ),
  "we-pay": walletAsset(
    "we-pay",
    imageLogo(
      WePayLogo,
      withCardAccent(
        withAppLogoSquare(DARK_MODE_LIGHT_AND_COLORED_CARD_SURFACE_LOGO),
        palette.violet[700],
        palette.violet[500]
      )
    )
  ),
} satisfies Record<SelectableEgyptianInstitutionId, EgyptianInstitutionAsset>;

export function getEgyptianInstitutionAsset(
  institutionId: SelectableEgyptianInstitutionId | null,
  kind: EgyptianInstitutionAssetKind
):
  | EgyptianInstitutionAsset
  | (typeof DEFAULT_EGYPTIAN_INSTITUTION_ASSETS)[typeof kind] {
  if (institutionId === null) {
    return DEFAULT_EGYPTIAN_INSTITUTION_ASSETS[kind];
  }

  return EGYPTIAN_INSTITUTION_ASSETS[institutionId];
}
