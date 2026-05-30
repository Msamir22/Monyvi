import type { ComponentType } from "react";
import type { ImageSourcePropType } from "react-native";
import type { SvgProps } from "react-native-svg";
import type { SelectableEgyptianInstitutionId } from "@monyvi/logic";

import AaibLogo from "../assets/institutions/banks/aaib.webp";
import AbkEgyptLogo from "../assets/institutions/banks/abk-egypt.svg";
import AdcbEgyptLogo from "../assets/institutions/banks/adcb-egypt.webp";
import AdibEgyptLogo from "../assets/institutions/banks/adib-egypt.png";
import AgriculturalBankOfEgyptLogo from "../assets/institutions/banks/agricultural-bank-of-egypt.png";
import AlBarakaEgyptLogo from "../assets/institutions/banks/al-baraka-egypt.webp";
import AlexbankLogo from "../assets/institutions/banks/alexbank.png";
import ArabBankLogo from "../assets/institutions/banks/arab-bank.svg";
import ArabInternationalBankLogo from "../assets/institutions/banks/arab-international-bank.png";
import AttijariwafaBankEgyptLogo from "../assets/institutions/banks/attijariwafa-bank-egypt.webp";
import BankAbcLogo from "../assets/institutions/banks/bank-abc.png";
import BankNxtLogo from "../assets/institutions/banks/bank-nxt.png";
import BanqueDuCaireLogo from "../assets/institutions/banks/banque-du-caire.png";
import BanqueMisrLogo from "../assets/institutions/banks/banque-misr.png";
import CibLogo from "../assets/institutions/banks/cib.webp";
import CitibankEgyptLogo from "../assets/institutions/banks/citibank-egypt.svg";
import CreditAgricoleEgyptLogo from "../assets/institutions/banks/credit-agricole-egypt.svg";
import EdbEgyptLogo from "../assets/institutions/banks/edb-egypt.png";
import EgBankLogo from "../assets/institutions/banks/eg-bank.png";
import EgyptianArabLandBankLogo from "../assets/institutions/banks/egyptian-arab-land-bank.png";
import EmiratesNbdEgyptLogo from "../assets/institutions/banks/emirates-nbd-egypt.png";
import FabMisrLogo from "../assets/institutions/banks/fab-misr.svg";
import FaisalIslamicBankEgyptLogo from "../assets/institutions/banks/faisal-islamic-bank-egypt.webp";
import HdbEgyptLogo from "../assets/institutions/banks/hdb-egypt.png";
import HsbcEgyptLogo from "../assets/institutions/banks/hsbc-egypt.svg";
import IndustrialDevelopmentBankLogo from "../assets/institutions/banks/industrial-development-bank.webp";
import KfhEgyptLogo from "../assets/institutions/banks/kfh-egypt.png";
import MashreqEgyptLogo from "../assets/institutions/banks/mashreq-egypt.webp";
import MidbankLogo from "../assets/institutions/banks/midbank.png";
import NbeLogo from "../assets/institutions/banks/nbe.webp";
import NbkEgyptLogo from "../assets/institutions/banks/nbk-egypt.jpg";
import QnbEgyptLogo from "../assets/institutions/banks/qnb-egypt.webp";
import SaibLogo from "../assets/institutions/banks/saib.png";
import StandardCharteredLogo from "../assets/institutions/banks/standard-chartered.svg";
import SuezCanalBankLogo from "../assets/institutions/banks/suez-canal-bank.png";
import TheUnitedBankLogo from "../assets/institutions/banks/the-united-bank.png";
import DefaultBankLogo from "../assets/institutions/defaults/bank.svg";
import DefaultWalletLogo from "../assets/institutions/defaults/wallet.svg";
import EAndCashLogo from "../assets/institutions/wallets/e-and-cash.webp";
import OrangeCashLogo from "../assets/institutions/wallets/orange-cash.png";
import VodafoneCashLogo from "../assets/institutions/wallets/vodafone-cash.svg";
import WePayLogo from "../assets/institutions/wallets/we-pay.webp";

type EgyptianInstitutionAssetKind = "bank" | "wallet";
export type InstitutionLogo =
  | {
      readonly format: "svg";
      readonly source: ComponentType<SvgProps>;
    }
  | {
      readonly format: "image";
      readonly source: ImageSourcePropType;
    };

export interface EgyptianInstitutionAsset {
  readonly institutionId: SelectableEgyptianInstitutionId;
  readonly kind: EgyptianInstitutionAssetKind;
  readonly logo: InstitutionLogo;
}

function svgLogo(source: ComponentType<SvgProps>): InstitutionLogo {
  return { format: "svg", source };
}

function imageLogo(source: ImageSourcePropType): InstitutionLogo {
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
    logo: svgLogo(DefaultBankLogo),
  },
  wallet: {
    institutionId: "manual-wallet",
    kind: "wallet",
    logo: svgLogo(DefaultWalletLogo),
  },
} as const;

export const EGYPTIAN_INSTITUTION_ASSETS = {
  "adcb-egypt": bankAsset("adcb-egypt", imageLogo(AdcbEgyptLogo)),
  "adib-egypt": bankAsset("adib-egypt", imageLogo(AdibEgyptLogo)),
  "agricultural-bank-of-egypt": bankAsset(
    "agricultural-bank-of-egypt",
    imageLogo(AgriculturalBankOfEgyptLogo)
  ),
  "abk-egypt": bankAsset("abk-egypt", svgLogo(AbkEgyptLogo)),
  "al-baraka-egypt": bankAsset("al-baraka-egypt", imageLogo(AlBarakaEgyptLogo)),
  aaib: bankAsset("aaib", imageLogo(AaibLogo)),
  "arab-bank": bankAsset("arab-bank", svgLogo(ArabBankLogo)),
  "arab-international-bank": bankAsset(
    "arab-international-bank",
    imageLogo(ArabInternationalBankLogo)
  ),
  "attijariwafa-bank-egypt": bankAsset(
    "attijariwafa-bank-egypt",
    imageLogo(AttijariwafaBankEgyptLogo)
  ),
  "bank-abc": bankAsset("bank-abc", imageLogo(BankAbcLogo)),
  "bank-nxt": bankAsset("bank-nxt", imageLogo(BankNxtLogo)),
  alexbank: bankAsset("alexbank", imageLogo(AlexbankLogo)),
  "banque-du-caire": bankAsset("banque-du-caire", imageLogo(BanqueDuCaireLogo)),
  "banque-misr": bankAsset("banque-misr", imageLogo(BanqueMisrLogo)),
  "citibank-egypt": bankAsset("citibank-egypt", svgLogo(CitibankEgyptLogo)),
  cib: bankAsset("cib", imageLogo(CibLogo)),
  "credit-agricole-egypt": bankAsset(
    "credit-agricole-egypt",
    svgLogo(CreditAgricoleEgyptLogo)
  ),
  "egyptian-arab-land-bank": bankAsset(
    "egyptian-arab-land-bank",
    imageLogo(EgyptianArabLandBankLogo)
  ),
  "eg-bank": bankAsset("eg-bank", imageLogo(EgBankLogo)),
  "emirates-nbd-egypt": bankAsset(
    "emirates-nbd-egypt",
    imageLogo(EmiratesNbdEgyptLogo)
  ),
  "edb-egypt": bankAsset("edb-egypt", imageLogo(EdbEgyptLogo)),
  "faisal-islamic-bank-egypt": bankAsset(
    "faisal-islamic-bank-egypt",
    imageLogo(FaisalIslamicBankEgyptLogo)
  ),
  "fab-misr": bankAsset("fab-misr", svgLogo(FabMisrLogo)),
  "hdb-egypt": bankAsset("hdb-egypt", imageLogo(HdbEgyptLogo)),
  "hsbc-egypt": bankAsset("hsbc-egypt", svgLogo(HsbcEgyptLogo)),
  "industrial-development-bank": bankAsset(
    "industrial-development-bank",
    imageLogo(IndustrialDevelopmentBankLogo)
  ),
  "kfh-egypt": bankAsset("kfh-egypt", imageLogo(KfhEgyptLogo)),
  "mashreq-egypt": bankAsset("mashreq-egypt", imageLogo(MashreqEgyptLogo)),
  midbank: bankAsset("midbank", imageLogo(MidbankLogo)),
  nbe: bankAsset("nbe", imageLogo(NbeLogo)),
  "nbk-egypt": bankAsset("nbk-egypt", imageLogo(NbkEgyptLogo)),
  "qnb-egypt": bankAsset("qnb-egypt", imageLogo(QnbEgyptLogo)),
  saib: bankAsset("saib", imageLogo(SaibLogo)),
  "standard-chartered": bankAsset(
    "standard-chartered",
    svgLogo(StandardCharteredLogo)
  ),
  "suez-canal-bank": bankAsset("suez-canal-bank", imageLogo(SuezCanalBankLogo)),
  "the-united-bank": bankAsset("the-united-bank", imageLogo(TheUnitedBankLogo)),
  "vodafone-cash": walletAsset("vodafone-cash", svgLogo(VodafoneCashLogo)),
  "e-and-cash": walletAsset("e-and-cash", imageLogo(EAndCashLogo)),
  "orange-cash": walletAsset("orange-cash", imageLogo(OrangeCashLogo)),
  "we-pay": walletAsset("we-pay", imageLogo(WePayLogo)),
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
