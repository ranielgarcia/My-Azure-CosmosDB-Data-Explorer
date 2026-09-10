import { useMemo } from "react";
import { Clock, Globe, MapPin, TriangleAlert, Warehouse } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useStockroomZonesByStore } from "@/hooks/useStockroomZonesByStore";
import { formatUtcInTimeZone } from "@/lib/dateFormat";
import type { StoreDetails } from "@/types/siteLocation";
import type { StockroomZone } from "@/types/stockroomZones";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ZoneRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

function ZoneCard({
  zone,
  timeZone,
}: {
  zone: StockroomZone;
  timeZone: string;
}) {
  const lastReset =
    formatUtcInTimeZone(zone.LastReset, timeZone) ?? zone.LastReset;
  return (
    <div className="space-y-1.5 rounded-md border border-border bg-background/60 p-2">
      <div>
        <p className="text-sm font-semibold leading-tight text-foreground">
          {zone.ZoneName}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Zone #{zone.Id}
        </p>
      </div>
      <ZoneRow label="Last Reset" value={lastReset} />
      <ZoneRow label="Reset By" value={zone.ResetBy} />
      <ZoneRow label="Reset Device" value={zone.ResetDeviceId} />
      <ZoneRow label="Reset Status" value={zone.ResetStatus} />
    </div>
  );
}

export function StoreDetailsCard({ store }: { store: StoreDetails }) {
  const { zones, isLoading, error } = useStockroomZonesByStore(store.StoreId);
  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => a.ZoneName.localeCompare(b.ZoneName)),
    [zones],
  );

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background/40 p-3">
      <div>
        <h3 className="text-sm font-semibold leading-tight text-foreground">
          {store.StoreName}
        </h3>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          Store #{store.StoreId}
        </p>
      </div>

      <Section icon={<Globe className="h-3.5 w-3.5" />} title="Time Zone">
        <p className="text-sm text-foreground">{store.TimeZone || "—"}</p>
      </Section>

      <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Address">
        <div className="space-y-0.5 text-sm text-foreground">
          {store.Address ? <p>{store.Address}</p> : null}
          <p className="text-muted-foreground">
            {[store.Suburb, store.StateCode, store.PostCode]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
        </div>
      </Section>

      <Section icon={<Clock className="h-3.5 w-3.5" />} title="Opening Hours">
        {store.OpeningHours && store.OpeningHours.length > 0 ? (
          <ul className="space-y-0.5">
            {store.OpeningHours.map((hour, index) => (
              <li
                key={`${hour.DayOfWeek}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">{hour.DayOfWeek}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {hour.OpeningTime} – {hour.ClosingTime}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No opening hours available.
          </p>
        )}
      </Section>

      <Section
        icon={<Warehouse className="h-3.5 w-3.5" />}
        title="Stockroom Zones"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            Loading zones…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              Failed to load zones
            </div>
            <p className="text-xs break-words text-destructive/90">
              {error.message}
            </p>
          </div>
        ) : sortedZones.length > 0 ? (
          <div className="space-y-2">
            {sortedZones.map((zone) => (
              <ZoneCard key={zone.Id} zone={zone} timeZone={store.TimeZone} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No stockroom zones found.
          </p>
        )}
      </Section>
    </div>
  );
}
