"use client";

import { useId } from "react";

import { cn } from "./class-names";

export interface ChoiceOption<Value extends string = string> {
  value: Value;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ChoiceChipsBaseProps<Value extends string> {
  options: readonly ChoiceOption<Value>[];
  legend?: string;
  label?: string;
  name?: string;
  className?: string;
  legendClassName?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

interface ChoiceChipsSingleProps<Value extends string>
  extends ChoiceChipsBaseProps<Value> {
  multiple?: false;
  value?: Value | null;
  onChange: (value: Value) => void;
  maxSelections?: never;
}

interface ChoiceChipsMultipleProps<Value extends string>
  extends ChoiceChipsBaseProps<Value> {
  multiple: true;
  value: readonly Value[];
  onChange: (value: Value[]) => void;
  maxSelections?: number;
}

export type ChoiceChipsProps<Value extends string = string> =
  | ChoiceChipsSingleProps<Value>
  | ChoiceChipsMultipleProps<Value>;

export function ChoiceChips<Value extends string = string>(
  props: ChoiceChipsProps<Value>,
) {
  const generatedId = useId();
  const name = props.name ?? `choice-${generatedId}`;
  const errorId = props.error ? `${name}-error` : undefined;
  const selectedValues: readonly Value[] = props.multiple
    ? props.value
    : props.value
      ? [props.value]
      : [];
  const selectionLimitReached =
    props.multiple &&
    props.maxSelections !== undefined &&
    selectedValues.length >= props.maxSelections;

  function select(option: ChoiceOption<Value>) {
    if (props.disabled || option.disabled) return;

    if (!props.multiple) {
      props.onChange(option.value);
      return;
    }

    const isSelected = props.value.includes(option.value);
    if (isSelected) {
      props.onChange(props.value.filter((value) => value !== option.value));
      return;
    }

    if (!selectionLimitReached) {
      props.onChange([...props.value, option.value]);
    }
  }

  return (
    <fieldset
      className={cn("m-0 min-w-0 border-0 p-0", props.className)}
      aria-describedby={errorId}
    >
      <legend
        className={cn(
          "mb-3 block text-sm font-semibold leading-5 text-ink",
          props.legendClassName,
        )}
      >
        {props.legend ?? props.label ?? "Auswahl"}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {props.options.map((option) => {
          const selected = selectedValues.includes(option.value);
          const optionDisabled =
            props.disabled ||
            option.disabled ||
            (selectionLimitReached && !selected);

          return (
            <label
              key={option.value}
              className={cn(
                "relative flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-[border-color,background-color,color,box-shadow]",
                selected
                  ? "border-accent bg-accent-soft text-ink shadow-sm"
                  : "border-line-strong bg-surface-raised text-ink-soft hover:border-accent-muted hover:bg-surface-muted",
                optionDisabled && "cursor-not-allowed opacity-45",
              )}
            >
              <input
                type={props.multiple ? "checkbox" : "radio"}
                name={name}
                value={option.value}
                checked={selected}
                disabled={optionDisabled}
                required={props.required && !props.multiple}
                onChange={() => select(option)}
                className="peer absolute size-px opacity-0"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-4 place-items-center rounded-full border transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-focus",
                  selected
                    ? "border-accent bg-accent"
                    : "border-line-strong bg-surface",
                )}
              >
                {selected ? (
                  <span className="size-1.5 rounded-full bg-on-accent" />
                ) : null}
              </span>
              <span>
                <span className="block">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {props.error ? (
        <p id={errorId} role="alert" className="mt-2 mb-0 text-sm text-danger">
          {props.error}
        </p>
      ) : null}
    </fieldset>
  );
}
