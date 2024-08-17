export default function InstructionComponent() {
  return (
    // Instructions
    <div className="p-6 ">
      <h2 className="text-2xl font-bold text-primary">Instructions</h2>
      <br />
      <pre className="text-muted-foreground text-wrap overflow-auto">
        1. Double press to add a glyph block
        <br />
        2. Right-click and press on delete to remove
        <br />
        3. Select a block and press the handle on the right to adjust the length
        <br />
        4. Drag a block to change it's position on the track
        <br />
        5. Click on the red timeline bar to seek audio
        <br /> <br />
        Extra Info:
        <br />- To use on phone, save the file, after downloading the tone,
        transfer it to your phone, then: <br />
        {"--->"} Open Glyph Composer
        <br />
        {"--->"} Select 3 dash icon on top left (if this isn't there, record a
        random song, it'll then appear) <br />
        {"--->"} Click 3 dot icon on top right <br />
        {"--->"} Select import and load up the transfered audio file (If file is
        long, it'll take time to import, be patient and try scrolling up,
        sometime files get's hidden up top on imports!)
        <br />
        {">"} NOTE: Glyph brightness is also dependent on Glyph brightness set from Phone settings, phone won't allow to go past this limit.
        <br />- Goes without saying, start off by loading the audio file
        <br />- Glyph block {"->"} indicates that glyph light will be on for
        that amount of time
        <br />- Glyph blocks can be understood as edits, as the entire
        experience is modeled after how professional editing softwares work
      </pre>
    </div>
  );
}
