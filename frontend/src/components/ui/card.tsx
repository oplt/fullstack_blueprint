import * as React from "react"
import { cn } from "@/lib/utils"

type CardProps = React.ComponentProps<"div"> & {
  as?: "div" | "section" | "article"
  size?: "default" | "lg" | "sm"
  variant?: "default" | "subtle" | "outlined" | "flat"
}

function Card({ className, as = "div", size = "default", variant = "default", ...props }: CardProps) {
  return React.createElement(as, {
    "data-slot": "card",
    "data-size": size,
    "data-variant": variant,
    className: cn("group/card ui-card", className),
    ...props,
  })
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header ui-card-header",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ as: Component = "div", className, ...props }: React.ComponentProps<"div"> & {
  as?: "div" | "h2" | "h3" | "h4" | "h5" | "h6"
}) {
  return (
    <Component
      data-slot="card-title"
      className={cn(
        "ui-card-title",
        className
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("ui-card-description", className)}
      {...props}
    />
  )
}

export function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "ui-card-action",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("ui-card-content", className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "ui-card-footer",
        className
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardContent }
