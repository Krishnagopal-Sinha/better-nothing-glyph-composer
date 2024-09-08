import { kAppName } from "@/lib/consts";

export default function FullPageAppLoaderPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2 justify-center items-center dark:invert">
          <span className="sr-only">Loading...</span>
          <div className="h-8 w-8 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-8 w-8  bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-8 w-8  bg-white rounded-full animate-bounce"></div>
        </div>
        <p className="text-2xl pt-6 font-medium  animate-pulse">Loading...</p>
        <h1 className="text-3xl font-bold font-[ndot] tracking-wider">
          {kAppName}
        </h1>
      </div>
    </div>
  );
}
