import Image from "next/image";

export function BrandMark(props: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  const size = props.size ?? 56;
  return (
    <div className={`flex flex-col items-center ${props.className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="CITOV"
        width={size}
        height={size}
        priority
        className="object-contain drop-shadow-[0_12px_28px_rgba(16,42,80,0.18)]"
      />
      {props.showWordmark ? (
        <div className="mt-4 text-center">
          <p className="text-3xl font-bold tracking-[0.22em] text-[var(--hero)] sm:text-4xl">
            CITOV
          </p>
          <p className="mt-2 text-sm font-light tracking-[0.04em] text-[var(--muted)] sm:text-base">
            There is another way
          </p>
        </div>
      ) : null}
    </div>
  );
}
