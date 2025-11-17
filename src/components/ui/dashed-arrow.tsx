export const DottedArrowLine: React.FC = () => {
  return (
    <div className="flex items-center w-full" aria-hidden="true">
      <div
        className="
          flex-1 h-[4px]
          bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400
          [mask-image:radial-gradient(circle,_#000_35%,_transparent_36%)]
          [mask-size:4px_4px]
          [mask-repeat:repeat-x]
        "
      />

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
