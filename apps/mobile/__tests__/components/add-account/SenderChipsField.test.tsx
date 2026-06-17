import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState, type JSX } from "react";

import { SenderChipsField } from "../../../components/add-account/SenderChipsField";

const translations: Record<string, string> = {
  sender_add_placeholder: "Add sender",
  sender_add_accessibility: "Add sender",
  sender_add_action: "Add",
  sender_remove_accessibility: "Remove {{sender}}",
  sender_duplicate_error: "This sender is already added",
  sender_unverified: "Unverified sender",
};

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    readonly t: (key: string, options?: Record<string, string>) => string;
  } => ({
    t: (key: string, options?: Record<string, string>): string =>
      (translations[key] ?? key).replace("{{sender}}", options?.sender ?? ""),
  }),
}));

describe("SenderChipsField", () => {
  it("renders preset senders as removable chips", () => {
    const onChange = jest.fn();

    render(
      <SenderChipsField value={["CIB", "CIBEGYPT"]} onChange={onChange} />
    );

    expect(screen.getByText("CIB")).toBeTruthy();
    expect(screen.getByText("CIBEGYPT")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Remove CIB"));

    expect(onChange).toHaveBeenCalledWith(["CIBEGYPT"]);
  });

  it("keeps sender chips and input readable in dark mode", () => {
    render(<SenderChipsField value={["CIB"]} onChange={jest.fn()} />);

    expect(screen.getByText("CIB")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(screen.getByLabelText("Remove CIB")).toHaveProp(
      "accessibilityRole",
      "button"
    );
    expect(screen.getByPlaceholderText("Add sender")).toHaveProp(
      "className",
      expect.stringContaining("dark:bg-slate-800")
    );
  });

  it("trims custom senders and rejects case-insensitive duplicates", () => {
    const onChange = jest.fn();

    render(<SenderChipsField value={["CIB"]} onChange={onChange} />);

    fireEvent.changeText(screen.getByPlaceholderText("Add sender"), "  cib  ");
    fireEvent.press(screen.getByLabelText("Add sender"));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("This sender is already added")).toBeTruthy();
  });

  it("allows unknown custom senders with an unverified hint", () => {
    const onChange = jest.fn();

    function ControlledField(): JSX.Element {
      const [senders, setSenders] = useState<readonly string[]>([]);

      return (
        <SenderChipsField
          value={senders}
          verifiedSenders={["CIB"]}
          onChange={(nextSenders) => {
            onChange(nextSenders);
            setSenders(nextSenders);
          }}
        />
      );
    }

    render(<ControlledField />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Add sender"),
      "CustomSMS"
    );
    fireEvent.press(screen.getByLabelText("Add sender"));

    expect(onChange).toHaveBeenCalledWith(["CustomSMS"]);
    expect(screen.getAllByText("Unverified sender").length).toBeGreaterThan(0);
  });

  it("clears the unverified hint after removing the custom sender", () => {
    function ControlledField(): JSX.Element {
      const [senders, setSenders] = useState<readonly string[]>([]);

      return (
        <SenderChipsField
          value={senders}
          verifiedSenders={["CIB"]}
          onChange={setSenders}
        />
      );
    }

    render(<ControlledField />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Add sender"),
      "CustomSMS"
    );
    fireEvent.press(screen.getByLabelText("Add sender"));
    expect(screen.getAllByText("Unverified sender").length).toBeGreaterThan(0);

    fireEvent.press(screen.getByLabelText("Remove CustomSMS"));

    expect(screen.queryByText("Unverified sender")).toBeNull();
  });
});
