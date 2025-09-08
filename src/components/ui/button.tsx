import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-[#004175] text-white hover:bg-[#00325d] focus-visible:ring-[#004175] disabled:bg-gray-400",
        outline: "bg-transparent text-blue-700 border border-blue-700 hover:bg-[#e6f0f8] focus-visible:ring-blue-600 disabled:border-gray-300 disabled:text-gray-300",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-400",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500 disabled:bg-gray-100",
        ghost: "bg-transparent text-[#004175] hover:bg-gray-100 focus-visible:ring-gray-500",
        link: "text-[#004175] underline-offset-4 hover:underline focus-visible:ring-[#004175]",
        icon: "hover:bg-transparent hover:text-gray-700 focus-visible:ring-gray-500 cursor-pointer bg-transparent border-none p-0",
      },
      size: {
        default: "h-8 px-4 py-2",
        sm: "h-8 px-3 py-1 text-sm",
        lg: "h-10 px-8 py-3",
        icon: "h-auto w-auto p-0",
        "icon-sm": "h-auto w-auto p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }