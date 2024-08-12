export default function ControlPanelComponent() {
  return (
    <div className=" rounded-lg shadow-lg p-6 flex-grow bg-[#111111]">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Simple Glyph Composer (ツ)
          </h2>
          <p className="text-muted-foreground">
            This app is usable but is still being actively being worked upon!
            <br />
            Supports: Nothing Phone(1) & Phone(2)
            <br />
            (v0.0.1)
          </p>
        </div>
      </div>
    </div>
  );
}
