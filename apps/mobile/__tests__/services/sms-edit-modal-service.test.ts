import { buildPendingAccount } from "@/services/sms-edit-modal-service";

describe("sms-edit-modal-service", () => {
  it("infers wallet pending accounts from known wallet senders", () => {
    const pendingAccount = buildPendingAccount("temp-wallet-1", {
      name: "Vodafone Cash",
      currency: "EGP",
      senderDisplayName: "VodafoneCash",
    });

    expect(pendingAccount).toMatchObject({
      tempId: "temp-wallet-1",
      type: "DIGITAL_WALLET",
      institutionId: "vodafone-cash",
      providerDisplayName: "Vodafone Cash",
    });
  });

  it("carries known bank identity into SMS-created pending accounts", () => {
    const pendingAccount = buildPendingAccount("temp-bank-1", {
      name: "CIB Bank",
      currency: "EGP",
      senderDisplayName: "CIB-EGYPT",
    });

    expect(pendingAccount).toMatchObject({
      tempId: "temp-bank-1",
      type: "BANK",
      institutionId: "cib",
      providerDisplayName: "CIB",
    });
  });

  it("keeps unknown SMS-created pending accounts as bank accounts", () => {
    const pendingAccount = buildPendingAccount("temp-bank-1", {
      name: "Unknown Bank",
      currency: "EGP",
      senderDisplayName: "UNKNOWN",
      cardLast4: "1234",
    });

    expect(pendingAccount).toMatchObject({
      tempId: "temp-bank-1",
      type: "BANK",
      cardLast4: "1234",
    });
    expect(pendingAccount.institutionId).toBeUndefined();
    expect(pendingAccount.providerDisplayName).toBeUndefined();
  });
});
