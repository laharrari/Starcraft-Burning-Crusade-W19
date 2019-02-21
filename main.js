/* #region Constants */
const AM = new AssetManager();
const GAME_ENGINE = new GameEngine();
const CAMERA = new Camera();
const DS = new DamageSystem();

var BACKGROUND;
var SCENE_MANAGER;
var canvasWidth;
var canvasHeight;
var myFloorNum = 1;
var myRoomNum = 1;

// Constant variable for tile size
const TILE_SIZE = 16;
/* #endregion */

/* #region Player */
function Player(spritesheet, xOffset, yOffset) {
    // Relevant for Player box
    this.width = 16;
    this.height = 28;
    this.scale = 1.5;
    this.xOffset = xOffset * this.scale;
    this.yOffset = yOffset * this.scale;
    this.animationRun = new Animation(spritesheet, this.width, this.height, 1, 0.08, 4, true, this.scale);
    this.animationIdle = this.animationRun;
    this.x = 60;
    this.y = 60;
    this.xScale = 1;
    this.damageObjArr = [];
    this.buffObj = [];
    this.abilityCD = [0, 0, 0, 0, 0];
    this.cooldownRate = 1;
    this.cooldownAdj = 0;
    this.isStunned = 0;
    this.ctx = GAME_ENGINE.ctx;
    this.baseMaxMovespeed = 2;
    this.maxMovespeedRatio = 1;
    this.maxMovespeedAdj = 0;
    this.right = true;
    this.health = 100;
    this.dontdraw = 0;
    this.boundingbox = new BoundingBox(this.x + 4, this.y + 14,
        this.width, this.height); // **Temporary** Hard coded offset values.
}

Player.prototype.draw = function () {
    this.xScale = 1;
    var xValue = this.x;
    if (!this.right) {
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.xScale = -1;
        xValue = -this.x - this.width;
    }
    //draw player character with no animation if player is not currently moving
    if (this.dontdraw <= 0) {
        if (!GAME_ENGINE.movement) {
            this.animationIdle.drawFrameIdle(this.ctx, xValue, this.y);
        } else {
            this.animationRun.drawFrame(GAME_ENGINE.clockTick, this.ctx, xValue, this.y);
        }

        this.ctx.restore();
        if (GAME_ENGINE.debug) {
            GAME_ENGINE.ctx.strokeStyle = "blue";
            GAME_ENGINE.ctx.strokeRect(this.boundingbox.x, this.boundingbox.y,
                this.boundingbox.width, this.boundingbox.height);
        }
    } else {
        this.dontdraw--;
    }
}

Player.prototype.update = function () {
    // Conditional check to see if player wants to sprint or not
    var sprint = GAME_ENGINE.keyShift ? 1.75 : 1;
    // Player movement controls

    if (this.isStunned <= 0) {
        /* #region Player movement controls */

        if (GAME_ENGINE.keyW === true) {
            this.y -= (this.baseMaxMovespeed * this.maxMovespeedRatio + this.maxMovespeedAdj) * sprint;
        }
        if (GAME_ENGINE.keyA === true) {
            this.x -= (this.baseMaxMovespeed * this.maxMovespeedRatio + this.maxMovespeedAdj) * sprint;
            this.right = false;
        }
        if (GAME_ENGINE.keyS === true) {
            this.y += (this.baseMaxMovespeed * this.maxMovespeedRatio + this.maxMovespeedAdj) * sprint;
        }
        if (GAME_ENGINE.keyD === true) {
            this.x += (this.baseMaxMovespeed * this.maxMovespeedRatio + this.maxMovespeedAdj) * sprint;
            this.right = true;
        }
        var actualSpeed = Math.floor((this.maxMovespeedRatio + this.maxMovespeedAdj) * sprint * 100);
        var speedHTML = document.getElementById("speed");
        speedHTML.innerHTML = + actualSpeed + "%";
        if (actualSpeed === 100)
        speedHTML.style.color = "lightgreen";
        else if (actualSpeed < 100)
        speedHTML.style.color = "red";
        else
        speedHTML.style.color = "white";
        /* #endregion */
    } else {
        this.isStunned--;
    }
    /* #region Abilities */
    let t;
    for (t in this.abilityCD) {
        this.abilityCD[t] += (this.abilityCD[t] > 0) ? -1 : 0;
        //ignoring index 0 of cd array
        if (t > 0) {
            var spellHTML = document.getElementById("spell" + t);
            //display if spell is ready to use or not
            if (this.abilityCD[t] > 0) {
                spellHTML.innerHTML = this.abilityCD[t] / 10;
                spellHTML.style.color = "red";
            } else {
                spellHTML.innerHTML = "Ready";
                spellHTML.style.color = "lightgreen";
            }
        }
    }
    for (t in GAME_ENGINE.digit) {
        if (GAME_ENGINE.digit[t]) {
            switch (GAME_ENGINE.playerPick) {
                case 0:
                    this.mageAbilities(t);
                    break;
                case 1:
                    this.rangerAbilities(t);
                    break;
                case 2:
                    this.knightAbilities(t);
                    break;
            }
        }
    }
    /* #endregion */


    if (this.health <= 0) {
        GAME_ENGINE.reset();
    }

    /* #region Damage system updates */
    let dmgObj;
    let dmgRemove = [];
    let dmgFlag;
    let buff;
    let buffRemove = [];
    let buffFlag;
    /* #region Updates */
    for (dmgObj in this.damageObjArr) {//Updates damage objects
        this.damageObjArr[dmgObj].update();
        if (this.damageObjArr[dmgObj].timeLeft <= 0) {
            dmgRemove.push(dmgObj);//Adds to trash system
        }
    }
    for (buff in this.buffObj) {//Updates buff objects
        this.buffObj[buff].update(this);
        if (this.buffObj[buff].timeLeft <= 0) {
            buffRemove.push(buff);//Adds to trash system
        }
    }
    /* #endregion */
    /* #region Removal */
    for (dmgFlag in dmgRemove) {//Removes flagged damage objects
        this.damageObjArr.splice(dmgRemove[dmgFlag], 1);
    }
    for (buffFlag in buffRemove) {//Removes flagged buff objects
        this.buffObj.splice(buffRemove[buffFlag], 1);
    }
    /* #endregion */
    /* #endregion */


    this.boundingbox = new BoundingBox(this.x + (this.xScale * 4), this.y + 13,
        this.width, this.height);
}


/* #region Player Ability functions */
Player.prototype.rangerAbilities = function (number) {
    if (this.abilityCD[number] <= 0) {
        switch (parseInt(number)) {
            case 0:
                //Ability at keyboard number 0
                break;
            case 1://Create BoostPad
                //Ability at keyboard number 1
                let castDistance = 125;
                let tempTrap = new RangerBoostPad(AM.getAsset("./img/floor_boostpad_on.png"),
                    AM.getAsset("./img/floor_boostpad_off.png"));
                let xDif, yDif, mag;
                xDif = this.x - GAME_ENGINE.mouseX + 10;
                yDif = this.y - GAME_ENGINE.mouseY + 10;
                mag = Math.pow(Math.pow(xDif, 2) + Math.pow(yDif, 2), 0.5);
                castDistance = Math.min(mag, castDistance);

                tempTrap.x = this.x - (xDif / mag) * castDistance;
                tempTrap.y = this.y - (yDif / mag) * castDistance;
                tempTrap.boundingbox = new BoundingBox(tempTrap.x, tempTrap.y, 20, 20);
                GAME_ENGINE.addEntity(tempTrap);
                this.abilityCD[number] = 60;
                break;
            case 2:
                //Ability at keyboard number 2
                break;
            case 3:
                //Ability at keyboard number 3
                break;
            case 4:
                //Ability at keyboard number 4
                break;
        }
    }
}
Player.prototype.mageAbilities = function (number) {
    if (this.abilityCD[number] <= 0) {
        switch (parseInt(number)) {
            case 0:
                //Ability at keyboard number 0
                break;
            case 1://Blink!
                //Ability at keyboard number 1
                let blinkDistance = 100;
                let xDif = this.x - GAME_ENGINE.mouseX;
                let yDif = this.y - GAME_ENGINE.mouseY;
                let mag = Math.pow(Math.pow(xDif, 2) + Math.pow(yDif, 2), 0.5);
                blinkDistance = Math.min(blinkDistance, mag);
                let ss1Ani = new Animation(AM.getAsset("./img/flash.png"), 16, 32, 1, 0.13, 4, true, 1.25);
                let ss2Ani = new Animation(AM.getAsset("./img/flash.png"), 16, 32, 1, 0.13, 4, true, 1.25);
                let ss1 = new stillStand(ss1Ani, 10, this.x, this.y);
                this.x -= (xDif / mag) * blinkDistance + 12;
                this.y -= (yDif / mag) * blinkDistance + 30;
                let ss2 = new stillStand(ss2Ani, 10, this.x, this.y);
                this.dontdraw = 10;
                this.isStunned = 10;
                GAME_ENGINE.addEntity(ss1);
                GAME_ENGINE.addEntity(ss2);
                this.abilityCD[number] = 120;
                break;
            case 2:
                //Ability at keyboard number 2
                break;
            case 3:
                //Ability at keyboard number 3
                break;
            case 4:
                //Ability at keyboard number 4
                break;
        }
    }
}
Player.prototype.knightAbilities = function (number) {
    if (this.abilityCD[number] <= 0) {
        switch (parseInt(number)) {
            case 0:
                //Ability at keyboard number 0
                break;
            case 1://Sword Boomerang
                //Ability at keyboard number 1
                let tempPro = new swordBoomerang(AM.getAsset("./img/swordBoomerang.png"),
                    this.x - (this.width / 2), this.y - (this.height / 2), GAME_ENGINE.mouseX, GAME_ENGINE.mouseY);
                tempPro.thrower = this;
                GAME_ENGINE.addEntity(tempPro);
                this.abilityCD[number] = 60;
                break;
            case 2:
                //Ability at keyboard number 2
                break;
            case 3:
                //Ability at keyboard number 3
                break;
            case 4:
                //Ability at keyboard number 4
                break;
        }
    }
}
/* #endregion */

Player.prototype.ChangeHealth = function (amount) {
    if (amount > 0) {
        //display healing animation
        //maybe have a health change threshold 
        //to actually have it display
    } else if (amount < 0) {
        //display damage animation
        //maybe have a health change threshold 
        //to actually have it display
    }
    this.health += amount;//Damage will come in as a negative value;
    var healthHTML = document.getElementById("health");
    if (this.health >= 66)
    healthHTML.style.color = "lightgreen";
    else if (this.health >= 33)
    healthHTML.style.color = "yellow";
    else
    healthHTML.style.color = "red";
    healthHTML.innerHTML = this.health;
}
/* #endregion */

/* #region Monster */
/* #region Base Monster */

function Monster(spritesheet) {
    Entity.call(this, GAME_ENGINE, 0, 350);
    this.scale = 1;
    this.width = 40;
    this.height = 56;
    this.animation = new Animation(spritesheet, this.width, this.height, 1, 0.15, 15, true, this.scale);
    this.speed = 100;
    this.ctx = GAME_ENGINE.ctx;
    this.health = 100;
    this.damageObjArr = [];
    this.damageObj = DS.CreateDamageObject(20, 0, DTypes.Normal, DS.CloneBuffObject(PremadeBuffs.HasteWeak));
    this.buffObj = [];
    this.counter = 0;

    this.boundingbox = new BoundingBox(this.x, this.y,
        this.width * this.scale, this.height * this.scale); // **Temporary** Hard coded offset values.
}

Monster.prototype.draw = function () {
    this.animation.drawFrame(GAME_ENGINE.clockTick, this.ctx, this.x, this.y);
    if (GAME_ENGINE.debug) {
        GAME_ENGINE.ctx.strokeStyle = "red";
        GAME_ENGINE.ctx.strokeRect(this.boundingbox.x, this.boundingbox.y,
            this.boundingbox.width, this.boundingbox.height);
    }

    // Displaying Monster health
    this.ctx.font = "15px Arial";
    this.ctx.fillStyle = "white";
    this.ctx.fillText("Health: " + this.health, this.x - 5 - CAMERA.x, this.y - 5 - CAMERA.y);
}

Monster.prototype.update = function () {
    if (this.health <= 0) this.removeFromWorld = true;
    this.x += GAME_ENGINE.clockTick * this.speed;
    if (this.x <= TILE_SIZE * 2) this.x = 450;
    Entity.prototype.update.call(this);
    this.boundingbox = new BoundingBox(this.x, this.y,
        this.width * this.scale, this.height * this.scale); // **Temporary** Hard coded offset values.

    if (this.boundingbox.collide(myPlayer.boundingbox)) {
        this.counter += GAME_ENGINE.clockTick;
        this.damageObj.ApplyEffects(myPlayer);
        if (this.counter > .018 && myPlayer.health > 0) {
            //myPlayer.health -= 5;
        }
        this.counter = 0;
    }

    /* #region Damage system updates */
    let dmgObj;
    let dmgRemove = [];
    let dmgFlag;
    let buff;
    let buffRemove = [];
    let buffFlag;
    /* #region Updates */
    for (dmgObj in this.damageObjArr) {//Updates damage objects
        this.damageObjArr[dmgObj].update();
        if (this.damageObjArr[dmgObj].timeLeft <= 0) {
            dmgRemove.push(dmgObj);//Adds to trash system
        }
    }
    for (buff in this.buffObj) {//Updates buff objects
        this.buffObj[buff].update(this);
        if (this.buffObj[buff].timeLeft <= 0) {
            buffRemove.push(buff);//Adds to trash system
        }
    }
    /* #endregion */
    /* #region Removal */
    for (dmgFlag in dmgRemove) {//Removes flagged damage objects
        this.damageObjArr.splice(dmgRemove[dmgFlag], 1);
    }
    for (buffFlag in buffRemove) {//Removes flagged buff objects
        this.buffObj.splice(buffRemove[buffFlag], 1);
    }
    /* #endregion */
    /* #endregion */

}

Monster.prototype.ChangeHealth = function (amount) {
    if (amount > 0) {
        //display healing animation
        //maybe have a health change threshold 
        //to actually have it display
    } else if (amount < 0) {
        //display damage animation
        //maybe have a health change threshold 
        //to actually have it display
    }
    this.health += amount;//Healing will come in as a positive number
}
/* #endregion */

/* #region Monster Types */
Devil.prototype = Monster.prototype;
Acolyte.prototype = Monster.prototype;

function Devil(spritesheet) {
    Monster.call(this, GAME_ENGINE, spritesheet);
    this.scale = 3;
    this.width = 16;
    this.height = 23;
    this.speed = 45;
    this.health = 200;

    this.x = 250;
    this.y = 250;

    this.counter = 0;
    this.animation = new Animation(spritesheet, this.width, this.height, 128, 0.15, 8, true, this.scale);
}

function Acolyte(spritesheet) {
    Monster.call(this, GAME_ENGINE, spritesheet);
    this.scale = 2;
    this.width = 16;
    this.height = 19;
    this.speed = 25;
    this.health = 150;

    this.animation = new Animation(spritesheet, this.width, this.height, 64, 0.15, 4, true, this.scale);

    this.x = 100;
    this.y = 100;

    this.counter = 0;
}
/* #endregion */
/* #endregion */

/* #region Projectile */
/* #region Base Projectile */
function Projectile(spriteSheet, originX, originY, xTarget, yTarget) {
    this.width = 100;
    this.height = 100;
    this.animation = new Animation(spriteSheet, this.width, this.height, 1, .085, 8, true, .75);

    this.x = originX - CAMERA.x;
    this.y = originY - CAMERA.y;

    this.xTar = xTarget - 20;
    this.yTar = yTarget - 35;
    // Determining where the projectile should go angle wise.
    this.angle = Math.atan2(this.yTar - this.y, this.xTar - this.x);
    this.counter = 0; // Counter to make damage consistent
    this.childUpdate;//function
    this.speed = 200;
    this.projectileSpeed = 7.5;
    this.damageObj = DS.CreateDamageObject(15, 0, DTypes.Normal, null);
    this.penetrative = false;
    this.ctx = GAME_ENGINE.ctx;
    Entity.call(this, GAME_ENGINE, originX, originY);

    this.boundingbox = new BoundingBox(this.x + 8, this.y + 25,
        this.width - 75, this.height - 75); // Hardcoded a lot of offset values

}

Projectile.prototype.draw = function () {
    this.animation.drawFrame(GAME_ENGINE.clockTick, this.ctx, this.x - 18, this.y - 4); // Hardcoded a lot of offset values
    if (GAME_ENGINE.debug) {
        GAME_ENGINE.ctx.strokeStyle = "yellow";
        GAME_ENGINE.ctx.strokeRect(this.boundingbox.x, this.boundingbox.y,
            this.boundingbox.width, this.boundingbox.height);
    }
}

Projectile.prototype.update = function () {
    //var projectileSpeed = 7.5;
    if (typeof this.childUpdate === 'function') {
        this.childUpdate();
    }
    // Generating the speed to move at target direction
    var velY = Math.sin(this.angle) * this.projectileSpeed;
    var velX = Math.cos(this.angle) * this.projectileSpeed;
    // Moving the actual projectile.
    this.x += velX;
    this.y += velY;

    if (this.x - CAMERA.x < 16 || this.x - CAMERA.x > 460
        || this.y - CAMERA.y < 0 || this.y - CAMERA.y > 430) this.removeFromWorld = true;
    Entity.prototype.update.call(this);

    this.boundingbox = new BoundingBox(this.x + 8, this.y + 25,
        this.width - 75, this.height - 75); // **Temporary** Hard coded offset values.

    for (var i = 0; i < GAME_ENGINE.entities[4].length; i++) {
        var entityCollide = GAME_ENGINE.entities[4][i];
        if (this.boundingbox.collide(entityCollide.boundingbox)) {
            if (GAME_ENGINE.entities[4][i].health > 0) {
                this.damageObj.ApplyEffects(GAME_ENGINE.entities[4][i]);
                this.removeFromWorld = (this.penetrative) ? false : true;
            }
        }
    }

    this.boundingbox = new BoundingBox(this.x + 8, this.y + 25,
        this.width - 75, this.height - 75); // Hardcoded a lot of offset values

}
/* #endregion */

/* #region Projetile Types */
swordBoomerang.prototype = Projectile.prototype;

function swordBoomerang(spriteSheet, originX, originY, xTarget, yTarget) {
    Projectile.call(this, spriteSheet, originX, originY, xTarget, yTarget);
    this.projectileSpeed = 7;
    this.timeLeft = 60;
    this.thrower = null;
    this.speedChange = -7 / 30;
    this.penetrative = true;
    this.damageObj = DS.CreateDamageObject(45, 0, DTypes.Slashing
        , DS.CloneBuffObject(PremadeBuffs.DamageOvertime));
    this.childUpdate = function () {
        this.projectileSpeed += this.speedChange;
        this.timeLeft--;
        if (this.thrower !== null && this.timeLeft < 30) {
            if (Math.abs(this.thrower.x - this.x) < 5 && Math.abs(this.thrower.y - this.y) < 5) {
                this.removeFromWorld = true;
            }
            this.angle = Math.atan2(this.y - this.thrower.y, this.x - this.thrower.x);
        }
    }
}
/* #endregion */
/* #endregion */

/* #region Trap */
/* #region Base Trap */
function Trap(spriteSheetUp, spriteSheetDown) {
    this.animationUp = new Animation(spriteSheetUp, 16, 16, 1, 0.13, 4, true, 1.25);
    this.animationDown = new Animation(spriteSheetDown, 16, 16, 1, 0.13, 4, true, 1.25);
    this.animationIdle = this.animationUp;
    this.x = 200; // Hardcorded temp spawn
    this.y = 200; // Hardcorded temp spawn
    this.activated = false; // Determining if trap has been activated
    this.counter = 0; // Counter to calculate when trap related events should occur
    this.doAnimation = false; // Flag to determine if the spikes should animate or stay still
    this.damageObj = DS.CreateDamageObject(10, 0, DTypes.Normal, DS.CloneBuffObject(PremadeBuffs.SlowStrong));
    this.ctx = GAME_ENGINE.ctx;

    this.boundingbox = new BoundingBox(this.x, this.y, 20, 20); // **Temporary** hardcode of width and height
}

Trap.prototype.draw = function () {
    if (!this.activated) {
        this.animationIdle.drawFrameIdle(this.ctx, this.x, this.y);
    } else {
        if (this.doAnimation) {
            this.animationUp.drawFrame(GAME_ENGINE.clockTick, this.ctx, this.x, this.y);
        } else {
            this.animationDown.drawFrameIdle(this.ctx, this.x, this.y);
        }
    }
    if (GAME_ENGINE.debug) {
        GAME_ENGINE.ctx.strokeStyle = "red";
        GAME_ENGINE.ctx.strokeRect(this.x, this.y, 20, 20); // **Temporary** Hard coded offset values
    }
}

Trap.prototype.update = function () {
    if (typeof this.lifeTime !== 'undefined') {
        if (this.lifeTime <= 0) {
            this.removeFromWorld = true;
        } else {
            this.lifeTime--;
        }
    }
    if (this.boundingbox.collide(myPlayer.boundingbox)) {
        // Remember what tick the collision happened
        this.counter += GAME_ENGINE.clockTick;
        // Check to make sure the animation happens first
        if (this.counter < .1) {
            this.doAnimation = true;
        } else { // Else keep the spikes up as the player stands over the trap
            this.doAnimation = false;
            // Nuke the player, but start the damage .13 ticks after they stand on the trap
            // This allows players to sprint accross taking 10 damage
            if (myPlayer.health > 0 && this.counter > 0.18) {
                //myPlayer.health -= 2;
                this.damageObj.ApplyEffects(myPlayer);
                this.counter = .1;
            }
        }
        this.activated = true;
    } else {
        this.activated = false;
        this.doAnimation = false;
        this.counter = 0;
    }
}
/* #endregion */

/* #region Trap Types */
RangerBoostPad.prototype = Trap.prototype;

function RangerBoostPad(spriteSheetUp, spriteSheetDown) {
    Trap.call(this, spriteSheetUp, spriteSheetDown);
    this.damageObj = DS.CreateDamageObject(0, 0, DTypes.None
        , DS.CreateBuffObject("ranger boost", [
            DS.CreateEffectObject(ETypes.MoveSpeedR, Math.pow(1.1, 10), 1, 1, 0),
            DS.CreateEffectObject(ETypes.MoveSpeedR, 1 / 1.1, 1, 100, 10)
        ]));
    this.lifeTime = 120;
}
/* #endregion */
/* #endregion */

/* #region Still Stand */
function stillStand(animation, duration, theX, theY) {
    this.timeLeft = duration;
    this.ani = animation;
    this.ctx = GAME_ENGINE.ctx;
    this.x = theX;
    this.y = theY;
    Entity.call(this, GAME_ENGINE, theX, theY);
}

stillStand.prototype.update = function () {
    this.timeLeft--;
    if (this.timeLeft <= 0) {
        this.removeFromWorld = true;
    }
}
stillStand.prototype.draw = function () {
    this.ani.drawFrame(GAME_ENGINE.clockTick, this.ctx, this.x, this.y);
}
/* #endregion */

/* #region BoundingBox */
// BoundingBox for entities to detect collision.
function BoundingBox(x, y, width, height) {
    this.x = x - CAMERA.x;
    this.y = y - CAMERA.y;
    this.width = width;
    this.height = height;

    this.left = x;
    this.top = y;
    this.right = this.left + width;
    this.bottom = this.top + height;
}

BoundingBox.prototype.collide = function (oth) {
    if (this.right > oth.left && this.left < oth.right && this.top < oth.bottom && this.bottom > oth.top) return true;
    return false;
}
/* #endregion */

/* #region Camera */
function Camera() {
    this.x = 0;
    this.y = 0;
}

Camera.prototype.update = function () { }

Camera.prototype.draw = function () { }


Camera.prototype.move = function (direction) {
    if (direction === "right") {
        this.x += canvasWidth;
        myPlayer.x = 60 + CAMERA.x;
        myRoomNum += 1;
        BACKGROUND.x -= 320;
        
    } else if (direction === "left") {
        this.x -= canvasWidth;
        myPlayer.x = canvasWidth - TILE_SIZE * 2 - 60 + CAMERA.x;
        myRoomNum -= 1;
        BACKGROUND.x += 320;
    } else if (direction === "up") {
        this.y -= canvasHeight;
        myPlayer.y = canvasHeight + TILE_SIZE * 2 + 60 + CAMERA.y;
        myFloorNum -= 1;
        BACKGROUND.y -= 320;
    } else if (direction === "down") {
        this.y += canvasHeight;
        myPlayer.y = 60 + CAMERA.y;
        myFloorNum += 1;
        BACKGROUND.y += 320;
    }
    document.getElementById("location").innerHTML = "Location: " + myFloorNum + "-" + myRoomNum;
}
/* #endregion */

function Door(theX, theY, theDirection) {
    this.x = theX;
    this.y = theY;
    this.ctx = GAME_ENGINE.ctx;
    this.direction = theDirection;
    this.image = new Image();
    this.image.src = "./img/wall_hole_2.png";
    this.boundingbox = new BoundingBox(this.x, this.y, 16, 16);
}

Door.prototype.update = function () {
    if (this.boundingbox.collide(myPlayer.boundingbox)) {
        CAMERA.move(this.direction);
    }
}

Door.prototype.draw = function () {
    this.ctx.drawImage(this.image, this.x - CAMERA.x, this.y - CAMERA.y, 16, 16);
}

/* #region Menu */

function Menu() {
    this.ctx = GAME_ENGINE.ctx;
    this.classButtonH = 35;
    this.classButtonY = canvasHeight / 2;

    this.ctx.font = "35px Arial";
    this.mageWidth = this.ctx.measureText("Mage").width;
    this.rangerWidth = this.ctx.measureText("Ranger").width;
    this.knightWidth = this.ctx.measureText("Knight").width;

    this.mageButtonX = canvasWidth / 2 - (this.mageWidth / 2);
    this.rangerButtonX = canvasWidth / 2 - (this.rangerWidth / 2);
    this.knightButtonX = canvasWidth / 2 - (this.knightWidth / 2);

    this.mageButtonY = (canvasHeight - (this.classButtonH * 3)) / 4;
    this.rangerButtonY = 2 * this.mageButtonY + this.classButtonH;
    this.knightButtonY = this.rangerButtonY + this.classButtonH + this.mageButtonY;

    this.background = new Image();
    this.background.src = "./img/menu_background.png";
}

Menu.prototype.update = function () { }

Menu.prototype.draw = function () {
    this.ctx.drawImage(this.background, 253, 0,
        canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);

    this.createClassButton("Mage", this.mageButtonX, this.mageButtonY);
    this.createClassButton("Ranger", this.rangerButtonX, this.rangerButtonY);
    this.createClassButton("Knight", this.knightButtonX, this.knightButtonY);
}

Menu.prototype.createClassButton = function (text, xPosition, YPosition) {
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = "1";
    this.ctx.font = "35px Arial";
    this.ctx.strokeText(text, xPosition, YPosition + this.classButtonH);
    this.ctx.fillStyle = "white";
    this.ctx.fillText(text, xPosition, YPosition + this.classButtonH);
}
/* #endregion */

/* #region Background */
function Background() {
    this.x = -640;
    this.y = -640;
    this.ctx = GAME_ENGINE.ctx;
    // Keeping track of the last direction the generator has moved.
    // 0 = North
    // 1 = East
    // 2 = South
    // 3 = West
    this.face = [];
    this.directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    this.map = [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
    ];
    this.row = 2;
    this.col = 2;
    this.roomCount = 0;
    this.map[this.row][this.col] = 2;
    this.zero = new Image();
    this.zero.src = "./img/floor1.png";
    this.one = new Image();
    this.one.src = "./img/floor2.png";
    this.two = new Image();
    this.two.src = "./img/blacktile.png";
    this.tile = null;
    this.drawFaceCount = 0;
}

Background.prototype.draw = function () {
    for (let i = 0; i < this.map.length; i++) {
        for (let j = 0; j < this.map[i].length; j++) {
            for (let r = 0; r < 20; r++) {
                for (let s = 0; s < 20; s++) {
                    // Determining tiles to choose
                    let tempTile = ROOMS[this.map[i][j]][r * 20 + s];
                    if (tempTile === 0) {
                        this.tile = this.one;
                    } else if (tempTile === 1) {
                        this.tile = this.zero;
                    } else {
                        this.tile = this.two;
                    }
                    // Drawing Tiles
                    this.ctx.drawImage(this.tile, this.x + j * 320 + s * TILE_SIZE, this.y + i * 320 + r * TILE_SIZE);
                }
            }
            
            // Drawing doors
            if (this.drawFaceCount < 6) {
                if (this.face[this.drawFaceCount] === 0) {
                    GAME_ENGINE.addEntity(new Door(i * 320 + 144, j * 320 + 0, "up"));
                    console.log("Door Up");
                } else if (this.face[this.drawFaceCount] === 1) {
                    GAME_ENGINE.addEntity(new Door(i * 320 + 304, j * 320 + 144, "right"));
                    console.log("Door Right");
                } else if (this.face[this.drawFaceCount] === 2) {
                    GAME_ENGINE.addEntity(new Door(i * 320 + 144, j * 320 + 304, "down"));
                    console.log("Door Down");
                } else if (this.face[this.drawFaceCount] === 3) {
                    GAME_ENGINE.addEntity(new Door(i * 320 + 0, j * 320 + 144, "left"));
                    console.log("Door Left");
                }
                this.drawFaceCount++;
            }
        }
    }
}

Background.prototype.update = function () {
};

Background.prototype.validDirection = function () {
    while (this.roomCount < 6) {
        let randomDirection = Math.floor(Math.random() * Math.floor(4));
        let tempRow = this.row + this.directions[randomDirection][0];
        let tempCol = this.col + this.directions[randomDirection][1];
        if (randomDirection === 0 && this.face[this.face.length - 1] === 2
            || randomDirection === 2 && this.face[this.face.length - 1] === 0
            || randomDirection === 1 && this.face[this.face.length - 1] === 3
            || randomDirection === 3 && this.face[this.face.length - 1] === 1) {
            randomDirection = Math.floor(Math.random() * Math.floor(4));
        } else {
            if (tempRow < this.map.length && tempRow > 0  && tempCol < this.map.length && tempCol > 0
                && this.map[tempRow][tempCol] === 0) {
                this.face.push(randomDirection);
                this.row += this.directions[randomDirection][0];
                this.col += this.directions[randomDirection][1];
                this.map[this.row][this.col] = 1;
                if (this.roomCount + 1 === 6) {
                    this.map[this.row][this.col] = 3;
                }
                this.roomCount++;
            }
        }
    }
    console.log(this.face);
}
/* #endregion */

/* #region Animation */
function Animation(spriteSheet, frameWidth, frameHeight,
    sheetWidth, frameDuration, frames, loop, scale) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.sheetWidth = sheetWidth;
    this.frames = frames;
    this.totalTime = frameDuration * frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.scale = scale;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y) {
    this.elapsedTime += tick;
    if (this.isDone()) {
        if (this.loop) this.elapsedTime = 0;
    }
    var frame = this.currentFrame();
    var xindex = 0;
    var yindex = 0;
    xindex = frame % this.sheetWidth;
    yindex = Math.floor(frame / this.sheetWidth);

    var xPosition;
    if (x >= 0) {
        xPosition = x - CAMERA.x;
    } else {
        xPosition = x + CAMERA.x;
    }

    ctx.drawImage(this.spriteSheet,
        xindex * this.frameWidth, yindex * this.frameHeight,
        this.frameWidth, this.frameHeight,
        xPosition, y - CAMERA.y,
        this.frameWidth * this.scale,
        this.frameHeight * this.scale);
}


Animation.prototype.drawFrameIdle = function (ctx, x, y) {
    var xPosition;
    if (x >= 0) {
        xPosition = x - CAMERA.x;
    } else {
        xPosition = x + CAMERA.x;
    }
    ctx.drawImage(this.spriteSheet,
        0, 0,
        this.frameWidth, this.frameHeight,
        xPosition, y - CAMERA.y,
        this.frameWidth * this.scale,
        this.frameHeight * this.scale);
}

Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}
/* #endregion */

/* #region Download queue and download */

// Ranger
AM.queueDownload("./img/ranger_run.png");
// Knight
AM.queueDownload("./img/knight_run.png");
AM.queueDownload("./img/swordBoomerang.png");
// Mage
AM.queueDownload("./img/mage_run.png");
AM.queueDownload("./img/flash.png");
// Floor Trap
AM.queueDownload("./img/floor_trap_up.png");
AM.queueDownload("./img/floor_trap_down.png");
// Boostpad
AM.queueDownload("./img/floor_boostpad_on.png");
AM.queueDownload("./img/floor_boostpad_off.png");
// Devil
AM.queueDownload("./img/devil.png");
// Acolyte
AM.queueDownload("./img/acolyte.png");
// Harrison's Fireball
AM.queueDownload("./img/fireball.png");
// Floor Gen Tiles
AM.queueDownload("./img/floor1.png");
AM.queueDownload("./img/floor2.png");
AM.queueDownload("./img/blacktile.png");

AM.downloadAll(function () {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    document.body.style.backgroundColor = "black";
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    GAME_ENGINE.init(ctx);
    GAME_ENGINE.start();

    GAME_ENGINE.addEntity(new Menu());
    BACKGROUND = new Background();
    SCENE_MANAGER = new SceneManager();
});
/* #endregion */