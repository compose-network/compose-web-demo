import type { ComponentPropsWithoutRef, FC } from "react";

export type ProgressIndicatorProps = {
  currentStep: 2 | 3 | 4;
};

type FCProps = FC<
  Omit<ComponentPropsWithoutRef<"div">, keyof ProgressIndicatorProps> &
    ProgressIndicatorProps
>;

export const ProgressIndicator: FCProps = ({ currentStep}) => {
  // Показываем точки для шагов 2, 3, 4 (не показываем для шага 1)
  const steps = [2, 3, 4];

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {steps.map((step) => (
        step === currentStep ? (
          <div
            key={step}
            className="w-3 h-3 rounded-full p-[3px] transition-colors duration-200"
            style={{
              background: 'linear-gradient(92deg, #14B5C0 8.16%, #24B979 51.94%, #E68713 95.72%)',
              borderRadius: '100px'
            }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: 'linear-gradient(92deg, #14B5C0 8.16%, #24B979 51.94%, #E68713 95.72%)'
              }}
            />
          </div>
        ) : (
          <div
            key={step}
            className={`w-3 h-3 rounded-full transition-colors duration-200 bg-gray-300`}
          />
        )
      ))}
    </div>
  );
};

ProgressIndicator.displayName = "ProgressIndicator";