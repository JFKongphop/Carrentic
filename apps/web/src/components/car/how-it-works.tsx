import { BadgeDollarSign, Car, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    icon: Car,
    title: "Tokenize the car",
    body: "A real car becomes an ERC-3643 security on Hedera — its value split into on-chain ownership shares.",
  },
  {
    icon: ShieldCheck,
    title: "Own a share (KYC)",
    body: "KYC-gated co-owners hold shares. Compliance is enforced by the token itself — non-compliant transfers revert.",
  },
  {
    icon: BadgeDollarSign,
    title: "Earn its rent",
    body: "The car is rented out. Rent is distributed pro-rata to owners and swapped through Uniswap — booked on-chain.",
  },
] as const;

export function HowItWorks({ className }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-3 @2xl/main:grid-cols-3 ${className ?? ""}`}>
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.title}
            className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-center gap-2">
              <span className="border-border text-accent grid size-7 place-items-center rounded-md border">
                <Icon size={15} strokeWidth={1.75} />
              </span>
              <span className="text-muted-foreground text-[11px] tabular-nums">
                Step {i + 1}
              </span>
            </div>
            <h3 className="text-[14px] font-semibold">{s.title}</h3>
            <p className="text-muted-foreground text-[12px] leading-relaxed">
              {s.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
