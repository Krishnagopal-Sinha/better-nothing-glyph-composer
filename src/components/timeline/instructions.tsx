export default function InstructionComponent() {
  return (
    // Instructions
    <div className="p-6 ">
      <h2 className="text-2xl font-bold text-primary font-[ndot] uppercase tracking-wide">Instructions</h2>
      <br />
      <pre className="text-muted-foreground text-wrap overflow-auto">
        1. Double press to add a glyph block, choose Glyph Zone numbers to add
        to that zone, a zone can target multiple glyphs (depending on device).
        Chose the add all button to add all glyphs to that instance.
        <br />
        2. Right-click and press on delete to remove, or select a block and then
        click delete icon.
        <br />
        3. Select a block and press the handle on the right to adjust the
        length.
        <br />
        4. Drag a block to change it's position on the track.
        <br />
        5. Click on the red timeline bar to seek audio, right-click it to set
        loops and to toggle glyph zone number, helpful stuff!
        <br /> <br />
        Extra Info:
        <br />- To use generated audio on phone, save the file, after
        downloading the tone, transfer it to your phone, then: <br />
        {"--->"} Open Glyph Composer
        <br />
        {"--->"} Select 3 dash icon on top left (if this isn't there, record a
        random song, it'll then appear) <br />
        {"--->"} Click 3 dot icon on top right <br />
        {"--->"} Select import and load up the transfered audio file (If file is
        long, it'll take time to import, be patient and try scrolling up,
        sometime files get's hidden up top on imports!)
        <br />
        {">"} NOTE: Glyph brightness is also dependent on Glyph brightness set
        from Phone settings, phone won't allow to go past this limit.
        <br />- Glyph Block - Indicates that glyph light will be on for
        that amount of time
        <br />- Goes without saying, start off by loading the audio file {">.<"}
      </pre>
    </div>
  );
}
