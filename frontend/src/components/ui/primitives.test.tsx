import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DatePicker } from "./date-picker"
import { ErrorState } from "./error-state"
import { FieldError } from "./field"
import { Input } from "./input"
import { LoadingState } from "./loading-state"
import { Button } from "./button"
import { cn } from "@/lib/utils"

describe("shared Base UI primitives", () => {
  it("merges utility classes with tailwind-merge", () => {
    expect(cn("px-2 text-sm", "px-4")).toContain("px-4")
    expect(cn("px-2 text-sm", "px-4")).not.toContain("px-2")
  })

  it("keeps form controls typed and keyboard-addressable", () => {
    render(
      <label>
        Name
        <Input aria-label="Name" />
      </label>,
    )

    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument()
  })

  it("renders field errors as an accessible alert", () => {
    render(<FieldError errors={[{ message: "Name is required" }]} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Name is required")
  })

  it("renders loading and retry states with semantic roles", () => {
    const onRetry = vi.fn()
    render(
      <>
        <LoadingState label="Loading projects" />
        <ErrorState onRetry={onRetry} />
      </>,
    )

    expect(screen.getByRole("status")).toHaveTextContent("Loading projects")
    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("formats a selected date through the date-picker trigger", () => {
    render(<DatePicker value={new Date(2026, 0, 15)} />)

    expect(screen.getByRole("button", { name: "Pick a date" })).toHaveTextContent(
      "January 15th, 2026",
    )
  })

  it("exposes the typed Base UI button contract", () => {
    render(<Button variant="outline">Continue</Button>)

    expect(screen.getByRole("button", { name: "Continue" })).toHaveAttribute(
      "data-slot",
      "button",
    )
  })
})
