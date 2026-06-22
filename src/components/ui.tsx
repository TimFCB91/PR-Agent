import Link from "next/link";
import type { ComponentProps } from "react";

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "rounded-lg border border-gray-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(
        "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cx(
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cx("mb-1 block text-sm font-medium text-gray-700", className)}
      {...props}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-700",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={cx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

const badgeColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  PLANNED: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  REPLIED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  EDITOR: "bg-teal-100 text-teal-700",
  VIEWER: "bg-gray-100 text-gray-700",
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        badgeColors[value] ?? "bg-gray-100 text-gray-700",
      )}
    >
      {value}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
