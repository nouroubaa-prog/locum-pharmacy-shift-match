import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { townsFor, type CountryCode } from "@/lib/locations";

export function TownSelect({
  id,
  country,
  value,
  onChange,
  invalid,
}: {
  id?: string;
  country: CountryCode;
  value: string;
  onChange: (town: string) => void;
  invalid?: boolean;
}) {
  const towns = townsFor(country);
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue placeholder="Choose nearest town" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {towns.map((t) => (
          <SelectItem key={t.name} value={t.name}>
            {t.name} <span className="text-muted-foreground">· {t.county}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
