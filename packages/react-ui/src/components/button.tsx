/* eslint-disable react/jsx-props-no-spreading */
import React, { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'cancel'

interface SubmitButtonProps {
  submit: true,
  onClick: undefined
}

interface NormalButtonProps {
  submit?: false,
  onClick?: () => void
}

interface BaseButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  forwardedRef?: React.MutableRefObject<HTMLButtonElement
  | null> | ((instance: HTMLButtonElement | null) => void) | null
}

type ButtonProps = BaseButtonProps & (SubmitButtonProps | NormalButtonProps)

const ButtonComponent = ({
  forwardedRef, submit, children,
  variant = 'primary',
  onClick = () => {},
} : ButtonProps) => (
  <button
    ref={forwardedRef}
    type={submit ? 'submit' : 'button'}
    onClick={onClick}
  >
    {children}
  </button>
)

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <ButtonComponent {...props} forwardedRef={ref} />,
)

export default Button
