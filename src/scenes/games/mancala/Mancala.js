import BaseContainer from '@scenes/base/BaseContainer'
import { Button, DraggableContainer, SimpleButton } from '@components/components'
import MancalaHint from './MancalaHint'
import MancalaPlayer from './MancalaPlayer'

export const preload = {
    key: 'mancala-pack',
    url: 'assets/media/games/mancala/mancala-pack.json',
    loadString: 'mancala'
}

/* START OF COMPILED CODE */

export default class Mancala extends BaseContainer {

    constructor(scene, x, y) {
        super(scene, x ?? 760, y ?? 480);

        /** @type {MancalaPlayer} */
        this.mancalaPlayer1;
        /** @type {MancalaPlayer} */
        this.mancalaPlayer2;
        /** @type {Phaser.GameObjects.Sprite} */
        this.popup;
        /** @type {MancalaHint} */
        this.hint;
        /** @type {Phaser.GameObjects.Image[]} */
        this.holes;

        // Window and backgrounds
        const window = scene.add.image(0, 0, "mancala", "window");
        const bg2 = scene.add.image(0, 118, "mancala", "player/bg").setFlipY(true);
        const bg1 = scene.add.image(0, -86, "mancala", "player/bg");
        const shadow = scene.add.image(0, 16, "mancala", "shadow");
        const board = scene.add.image(0, 10, "mancala", "board");
        this.add([window, bg2, bg1, shadow, board]);

        // Hole configuration
        const holeConfigs = [
            { x: -144, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },       // 0
            { x: -86, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },         // 1
            { x: -28, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },         // 2
            { x: 30, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },          // 3
            { x: 88, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },          // 4
            { x: 146, y: 40, frame: 'hole', origin: [0.5102, 0.5102] },         // 5
            { x: 200, y: 11, frame: 'hole_2', origin: [0.5, 0.50476] },         // 6
            { x: 146, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },        // 7
            { x: 88, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },         // 8
            { x: 30, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },         // 9
            { x: -28, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },       // 10
            { x: -86, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },       // 11
            { x: -144, y: -20, frame: 'hole', origin: [0.5102, 0.5102] },      // 12
            { x: -200, y: 11, frame: 'hole_1', origin: [0.5, 0.50476] }        // 13
        ];

        // Create holes
        this.holes = holeConfigs.map(config => {
            const hole = scene.add.image(config.x, config.y, "mancala", config.frame);
            hole.setOrigin(...config.origin);
            this.add(hole);
            return hole;
        });

        // Players
        this.mancalaPlayer1 = new MancalaPlayer(scene, -193, 136);
        this.mancalaPlayer2 = new MancalaPlayer(scene, -193, -104);
        this.add([this.mancalaPlayer1, this.mancalaPlayer2]);

        // Popup and hint
        this.popup = scene.add.sprite(4, 16, "mancala", "popup/popup0005").setVisible(false);
        this.hint = new MancalaHint(scene, -144, -20).setVisible(false);
        this.add([this.popup, this.hint]);

        // Close button
        const xButton = scene.add.image(252, -160, "main", "blue-button");
        const blueX = scene.add.image(252, -162, "main", "blue-x");
        this.add([xButton, blueX]);

        // Components
        new DraggableContainer(this).handle = window;
        new Button(xButton).set({spriteName: "blue-button", callback: () => this.close()});

        // Player setup
        this.mancalaPlayer1.setup(bg2, this.holes[6]);
        this.mancalaPlayer2.setup(bg1, this.holes[13]);

        /* START-USER-CTR-CODE */
        this.maxStoneColor = 5;
        this.holeSize = 49;
        this.dropDelay = 168;
        this.captureDelay = 130;
        this.mancalaIndexes = new Set([6, 13]);

        this.popup.setInteractive()
            .on('animationcomplete', animation => this.onPopupComplete(animation));

        this.createButtons();
        /* END-USER-CTR-CODE */
    }

    /* START-USER-CODE */

    createButtons() {
        this.holes.forEach(hole => {
            hole.stones = [];
            hole.index = this.holes.indexOf(hole);
            
            const button = new SimpleButton(hole);
            button.pixelPerfect = false;
            
            if (!this.mancalaIndexes.has(hole.index)) {
                button.callback = () => this.onHoleClick(hole);
            }
            
            button.hoverCallback = () => this.onHoleOver(hole);
            button.hoverOutCallback = () => this.onHoleOut(hole);
        });
    }

    setupMap() {
        let currentColor = 1;
        this.map.forEach((count, i) => {
            for (let j = 0; j < count; j++) {
                this.createStone(i, currentColor);
                currentColor = (currentColor % this.maxStoneColor) + 1;
            }
        });
        this.updateScore();
        this.mancalaPlayer1.setActive();
        this.mancalaPlayer2.setActive();
    }

    moveStones(args) {
        this.currentTurn = args.turn;
        const hole = this.holes[args.hole];
        this.wait = true;

        hole.stones.forEach(stone => this.pickUpStone(stone));
        hole.stones.slice().reverse().forEach(stone => this.bringToTop(stone));

        let nextHole = hole.index;
        let i = 1;

        while (hole.stones.length) {
            nextHole = this.getNextHole(nextHole);
            const stone = hole.stones.shift();
            this.dropStone(i++, stone, this.holes[nextHole]);
        }

        this.delayedCall(i * this.dropDelay, () => this.updateTurn(nextHole, args.move));
    }

    updateStonePos(stone, hole) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Phaser.Math.Between(0, this.holeSize / 4);
        stone.setPosition(
            hole.x + Math.sin(angle) * radius,
            hole.y + Math.cos(angle) * radius
        );
        hole.stones.push(stone);
    }

    /* END-USER-CODE */
}

/* END OF COMPILED CODE */
