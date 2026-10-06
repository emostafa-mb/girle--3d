import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
};

export function Field({ label, name, hint, errors, id, ...inputProps }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} name={name} aria-describedby={hintId} aria-invalid={errors?.length ? true : undefined} {...inputProps} />
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
