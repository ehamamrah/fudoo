import { Link, type LinkProps } from "react-router-dom";

export function TextLink({ className = "", ...props }: LinkProps) {
  return <Link className={`font-medium text-brand-700 hover:text-brand-800 hover:underline ${className}`} {...props} />;
}
