import { GameNode, ImageNode } from "skydapp-browser";
import WorldUI from "../ui/WorldUI";

export default class World extends GameNode {

    public ui: WorldUI;

    constructor() {
        super(0, 0);
        let testMap;
        this.append(
            testMap = new ImageNode(0, 0, "/images/ui/lpc_home_cup.gif"),
            this.ui = new WorldUI(),
        );
        testMap.scale = 3;
    }
}
