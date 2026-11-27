/* eslint-disable react-refresh/only-export-components */
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button ui-button",
  {
    variants: {
      variant: {
        default: "ui-button-variant-default",
        outline:
          "ui-button-variant-outline",
        secondary:
          "ui-button-variant-secondary",
        ghost:
          "ui-button-variant-ghost",
        "nav-ghost":
          "ui-button-variant-nav-ghost",
        marketing:
          "ui-button-variant-marketing",
        "marketing-secondary":
          "ui-button-variant-marketing-secondary",
        category:
          "ui-button-variant-category",
        destructive:
          "ui-button-variant-destructive",
        link: "ui-button-variant-link",
      },
      size: {
        default: "ui-button-size-default",
        nav: "ui-button-size-nav",
        category: "ui-button-size-category",
        xs: "ui-button-size-xs",
        sm: "ui-button-size-sm",
        lg: "ui-button-size-lg",
        icon: "ui-button-size-icon",
        "icon-xs": "ui-button-size-icon-xs",
        "icon-sm": "ui-button-size-icon-sm",
      },
    },
    compoundVariants: [
      { variant: "nav-ghost", size: "default", class: "ui-button-nav-padding" },
      { variant: "category", size: "default", class: "ui-button-category-padding" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
