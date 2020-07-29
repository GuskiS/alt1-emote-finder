import * as a1lib from "@alt1/base";

import Position from "./helpers/Position";
import ImageDataSet from "./helpers/ImageDataSet";

//tell webpack to add index.html and appconfig.json to output
require("!file-loader?name=[name].[ext]!./index.html");
require("!file-loader?name=[name].[ext]!./appconfig.json");
require("!file-loader?name=[name].[ext]!./icon.png");

const OVERLAY_GROUP = "Emotes";
const EMOTE_LIST = [
  "No",
  "Bow",
  "Angry",
  "Think",
  "Wave",
  "Shrug",
  "Cheer",
  "Beckon",
  "Laugh",
  "Jump For Joy",
  "Yawn",
  "Dance",
  "Jig",
  "Twirl",
  "Headbang",
  "Cry",
  "Blow Kiss",
  "Panic",
  "Raspberry",
  "Clap",
  "Salute",
  "Idea",
];

window.addEventListener("DOMContentLoaded", () => {
  setInterval(emotes, 2000);
});

const strips = a1lib.ImageDetect.webpackImages({
  strip: require("./strip.data.png"),
});

export const emotes = () => {
  const strip = strips.strip;
  const frame = a1lib.captureHoldFullRs();
  const color = a1lib.mixColor(255, 255, 255);

  const width = strip.width / EMOTE_LIST.length;
  const height = strip.height;

  const spacing = EMOTE_LIST.map(() => width);
  const dataSet = ImageDataSet.fromFilmStripUneven(strip, spacing);
  const positions = dataSet.buffers.flatMap((buffer) => frame.findSubimage(buffer));

  document.getElementById("error").textContent = positions.length ? "" : "Tab is not visible";

  const normalizedYs = Position.normalizeYPositions(positions);

  window.alt1.overLayClearGroup(OVERLAY_GROUP);
  window.alt1.overLaySetGroup(OVERLAY_GROUP);
  window.alt1.overLayFreezeGroup(OVERLAY_GROUP);
  positions.forEach((position, index) => {
    const size = 7;
    const title = EMOTE_LIST[index];
    const x = position.x + Math.round(width / 2);
    const y = Position.findClosest(normalizedYs, position.y) + height + Math.round(size / 2);

    window.alt1.overLayTextEx(title, color, size, x, y, 5000, "sans-serif", true, true);
  });
  window.alt1.overLayRefreshGroup(OVERLAY_GROUP);
};

if (window.alt1) {
  //tell alt1 about the app
  //this makes alt1 show the add app button when running insane the embedded browser
  //also updates app settings if they are changed
  window.alt1.identifyAppUrl("./appconfig.json");
}
