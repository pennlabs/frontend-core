import React, { forwardRef } from 'react'

type ButtonVariant = "primary" | "secondary" | "cancel"

interface ButtonProps {
    variant: ButtonVariant
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const { variant , children} = props;
    return (
        <button ref={ref}>
            {children}
        </button>
    )
})

export default Button