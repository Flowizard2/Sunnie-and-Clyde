export class Light {

    constructor({
        color = [255, 255, 255],
        direction = [0.2, 0.9, 1],        
        intensity = 1.0,  // new property
        range = 50,       // new property
    } = {}) {
        this.color = color;
        this.direction = direction;
        this.intensity = intensity;
        this.range = range;
    }

}
