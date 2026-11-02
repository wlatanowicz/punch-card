import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SixCharCodeInput } from "./SixCharCodeInput";

describe("SixCharCodeInput", () => {
  it("uppercases the code", () => {
    const onChange = vi.fn();
    render(
      <MantineProvider>
        <SixCharCodeInput label="Code" value="" onChange={onChange} />
      </MantineProvider>,
    );

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "ab12cd" } });

    expect(onChange).toHaveBeenCalledWith("AB12CD");
  });
});
