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
        className="object-contain"
      />
      {props.showWordmark ? (
        <div className="mt-3 text-center">
          <p className="text-2xl font-bold tracking-[0.22em] text-[var(--hero)] sm:text-3xl">
            CITOV
          </p>
          <p className="mt-1 text-sm font-light tracking-wide text-[var(--muted)]">
            There is another way
          </p>
        </div>
      ) : null}
    </div>
  );
}
