// import { cn } from "@/lib/utils/tw";
//
// interface DashedArrowProps {
//   className?: string;
//   direction?: "down" | "right";
// }
//
// export const DashedArrow = ({
//   className,
//   direction = "right"
// }: DashedArrowProps) => {
//   if (direction === "down") {
//     return (
//       <div className={cn("flex flex-col items-center justify-center", className)}>
//         <svg
//           width="16"
//           height="40"
//           viewBox="0 0 16 40"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           {/* Dashed line */}
//           <line
//             x1="8"
//             y1="0"
//             x2="8"
//             y2="32"
//             stroke="#9CA3AF"
//             strokeWidth="1.5"
//             strokeDasharray="3 3"
//           />
//           {/* Arrow head */}
//           <path
//             d="M8 32L4 28H12L8 32Z"
//             fill="#18B5B8"
//           />
//         </svg>
//       </div>
//     );
//   }
//
//   return (
//     <div className={cn("flex items-center w-full", className)}>
//       <div className="flex-1 flex items-center justify-between">
//         {Array.from({ length: 100 }).map((_, i) => (
//           <div
//             key={i}
//             className="w-[2px] h-[2px] rounded-full"
//             style={{ backgroundColor: '#F49E34' }}
//           />
//         ))}
//       </div>
//       <div className="flex items-center gap-0 -ml-2">
//         {Array.from({ length: 3 }).map((_, i) => (
//           <div
//             key={i}
//             className="inline-block p-[3px] border-solid border-0 border-r-[3px] border-b-[3px] transform rotate-[-45deg]"
//             style={{ borderColor: '#F49E34' }}
//           />
//         ))}
//       </div>
// </div>
//   );
// };

// DottedArrowLine.tsx
export const DottedArrowLine: React.FC = () => {
  return (
    <div className="flex items-center w-full" aria-hidden="true">
      {/* Линия из точек с градиентом */}
      <div
        className="
          flex-1 h-[4px]
          bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400
          [mask-image:radial-gradient(circle,_#000_35%,_transparent_36%)]
          [mask-size:4px_4px]
          [mask-repeat:repeat-x]
        "
      />

      {/* Три стрелки справа */}
      <div className="flex ">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="inline-block p-[3px] border-solid border-0 border-r-[3px] border-b-[3px] transform rotate-[-45deg]"
            style={{ borderColor: "#F49E34" }}
          />
        ))}
      </div>
    </div>
  );
};
