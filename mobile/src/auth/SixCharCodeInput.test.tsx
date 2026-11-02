import { fireEvent, render } from "@testing-library/react-native";

import { SixCharCodeInput } from "./SixCharCodeInput";

describe("SixCharCodeInput", () => {
  it("uppercases text changes", async () => {
    const onChange = jest.fn();
    const screen = await render(<SixCharCodeInput label="Code" value="" onChange={onChange} />);

    fireEvent.changeText(screen.getByLabelText("Code"), "ab12cd");

    expect(onChange).toHaveBeenCalledWith("AB12CD");
  });
});
