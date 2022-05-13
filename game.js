class Game {
  constructor(scene, camera) {
    //TODO - METER OS OBSTACULOS E LIFE A NAO APARECER TANTO PARA FORA
    this.speed = 20;
    this._initializeScene(scene, camera, false);

    this.scene = scene;
    this.camera = camera;

    this.health = 50;
    this.score = 0;

    this.healtHTML = document.getElementById("health");
    this.scoreHTML = document.getElementById("score");

    this.running = false;

    this.gameover = document.getElementById("gameover");
    this.finalscore = document.getElementById("finalscore");

    //start the game
    document.getElementById("start_button").onclick = () => {
      this.running = true;
      document.getElementById("initial_page").style.display = "none";
    };

    //levelling up the game
    this.firstLevel = true;
    this.distanceOnLevel = 0;

    this.levelUp = document.getElementById("levelUp");

    //restart the game
    document.getElementById("replay_button").onclick = () => {
      document.location.reload(true);
    };

    //input event
    //https://threejs.org/docs/#api/en/animation/PropertyBinding
    document.addEventListener("keydown", this._onDocumentKeyDown.bind(this));
  }

  update() {
    if (this.running) {
      this.time += this.clock.getDelta();

      this._moveField();
      this._checkCollision();
      this._distanceCovered();
      this._checkBiggerLevel();

      if (this.levelUp.style.display == "grid") {
        setTimeout(() => {
          this.levelUp.style.display = "none";
        }, 1000);
      }
    }
  }

  _moveField() {
    this.grid.material.uniforms.time.value = this.time * 2;
    this.objects.position.z = this.speed * this.time;

    //Object Pooling - https://gameprogrammingpatterns.com/object-pool.html

    this.objects.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const childPos = child.position.z + this.objects.position.z;

        if (childPos > 0) {
          //reset the elems
          if (child.userData.type == "obstacule") {
            this._configObstacule(
              child,
              this.airplane.position.x,
              -this.objects.position.z
            );
          } else {
            this._configLife(
              child,
              this.airplane.position.x,
              -this.objects.position.z
            );
          }
        }
      }
    });
  }

  // all of this code to create the grid field (infinite) was taken from : https://stackoverflow.com/questions/51470309/three-js-and-infinite-forward-grid-movement
  _createField(scene) {
    var division = 20;
    var limit = 100;
    this.grid = new THREE.GridHelper(limit * 2, division, "blue", "blue");

    var moveable = [];
    for (let i = 0; i <= division; i++) {
      moveable.push(1, 1, 0, 0); // move horizontal lines only (1 - point is moveable)
    }
    this.grid.geometry.addAttribute(
      "moveable",
      new THREE.BufferAttribute(new Uint8Array(moveable), 1)
    );
    this.grid.material = new THREE.ShaderMaterial({
      uniforms: {
        time: {
          value: 0,
        },
        limits: {
          value: new THREE.Vector2(-limit, limit),
        },
        speed: {
          value: 5,
        },
      },
      vertexShader: `
    uniform float time;
    uniform vec2 limits;
    uniform float speed;
    
    attribute float moveable;
    
    varying vec3 vColor;
  
    void main() {
      vColor = color;
      float limLen = limits.y - limits.x;
      vec3 pos = position;
      if (floor(moveable + 0.5) > 0.5){ // if a point has "moveable" attribute = 1 
        float dist = speed * time;
        float currPos = mod((pos.z + dist) - limits.x, limLen) + limits.x;
        pos.z = currPos;
      } 
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
    }
  `,
      fragmentShader: `
    varying vec3 vColor;
  
    void main() {
      gl_FragColor = vec4(vColor, 1.);
    }
  `,
      vertexColors: THREE.VertexColors,
    });

    scene.add(this.grid);

    this.time = 0;
    this.clock = new THREE.Clock();
  }

  _ilumination(scene) {
    scene.fog = new THREE.Fog(0xffffff, 1000, 4000);

    scene.add(new THREE.AmbientLight(0x222222));

    const light = new THREE.DirectionalLight(0xffffff, 2.25);
    light.position.set(200, 450, 500);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 512;

    light.shadow.camera.near = 100;
    light.shadow.camera.far = 1200;

    light.shadow.camera.left = -1000;
    light.shadow.camera.right = 1000;
    light.shadow.camera.top = 350;
    light.shadow.camera.bottom = -350;

    scene.add(light);
  }

  _spawnObstacules() {
    //geometry
    const obsGeo = new THREE.BoxBufferGeometry(1, 1, 1);
    const obsMaterial = new THREE.MeshBasicMaterial({ color: 0xccdeee });
    const obstacule = new THREE.Mesh(obsGeo, obsMaterial);

    this._configObstacule(obstacule);
    obstacule.userData = { type: "obstacule" };
    this.objects.add(obstacule);
  }

  _configObstacule(obj, xPos = 0, zPos = 0) {
    //random scale
    obj.scale.set(
      this._randomVal(0.5, 2),
      this._randomVal(0.5, 2),
      this._randomVal(0.5, 2)
    );

    //random position
    obj.position.set(
      xPos + this._randomVal(-15, 15),
      obj.scale.y * 0.75,
      zPos - 100 - this._randomVal(0, 100)
    );
  }

  _randomVal(min, max) {
    return Math.random() * (max - min) + min;
  }

  _checkCollision() {
    this.objects.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const childPos = child.position.z + this.objects.position.z;
        // possible airplane position X : [-3, 3]
        // possible airplane position Y : [0, 1]

        const touchLimitX = 1 + this.airplane.scale.x / 2;
        const touchLimitZ = 1 + this.airplane.scale.z / 2;
        const touchLimitY = 1 + this.airplane.scale.y / 2;

        if (
          childPos > -touchLimitZ &&
          Math.abs(child.position.x - this.airplane.position.x) < touchLimitX &&
          Math.abs(child.position.y - this.airplane.position.y) < touchLimitY
        ) {
          //collision

          if (child.userData.type == "obstacule") {
            // reduce health bar
            this.health -= 10;
            this.healtHTML.innerText = this.health;
            this._configObstacule(
              child,
              this.airplane.position.x,
              -this.objects.position.z
            );
            if (this.health == 0) {
              this._gameover();
            }
          } else {
            // increase health bar
            this.health += 10;
            this.healtHTML.innerText = this.health;
            this._configLife(
              child,
              this.airplane.position.x,
              -this.objects.position.z
            );
          }
        }
      }
    });
  }

  _checkBiggerLevel() {
    if (this.distanceOnLevel > 2000) {
      this.levelUp.style.display = "grid";
      this.speed += 5;
      this._spawnObstacules();
      this._spawnLife();
      this.distanceOnLevel = 0;
    }
  }

  _distanceCovered() {
    this.distanceOnLevel += 1;
    this.scoreHTML.innerText = this.objects.position.z.toFixed(0);
  }

  _restartGame(replay) {
    this.score = 0;
    this.health = 50;

    this.scoreHTML.innerText = this.score;
    this.healtHTML.innerText = this.health;

    this.time = 0;
    this.clock = new THREE.Clock();

    this._initializeScene(this.scene, this.camera, replay);
  }

  _gameover() {
    this.running = false;

    this.finalscore.innerText = this.objects.position.z.toFixed(0);
    this.gameover.style.display = "grid";
  }

  _spawnLife() {
    const x = 0,
      y = -15;
    const heartShape = new THREE.Shape();

    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    const heartGeometry = new THREE.ShapeGeometry(heartShape);
    const heartMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const heart = new THREE.Mesh(heartGeometry, heartMaterial);

    heart.rotateX((100 * Math.PI) / 100);
    heart.rotateY((100 * Math.PI) / 100);
    heart.scale.set(0.1, 0.1, 0.1);

    this._configLife(heart);
    heart.userData = { type: "life" };
    this.objects.add(heart);
  }

  _configLife(obj, xPos = 0, zPos = 0) {
    //random position
    obj.position.set(
      xPos + this._randomVal(-30, 30),
      obj.scale.y * 0.5,
      zPos - 100 - this._randomVal(0, 100)
    );
  }

  _makePlane(scene) {
    const planegeometry = new THREE.CylinderGeometry(0.1, 0.4, 3, 8);
    const planematerial = new THREE.MeshLambertMaterial({ color: 0x193519 });
    const airplaneBody = new THREE.Mesh(planegeometry, planematerial);

    airplaneBody.rotateX((45 * Math.PI) / 100);
    airplaneBody.rotateY((70 * Math.PI) / 100);

    this.airplane = new THREE.Group();

    this.airplane.add(airplaneBody);

    const wingGeo = new THREE.BoxGeometry(2.2, 1, 0.05);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x193519 });
    const aboveWing = new THREE.Mesh(wingGeo, wingMaterial);
    const belowWing = new THREE.Mesh(wingGeo, wingMaterial);

    const backWingGeo = new THREE.BoxGeometry(1.3, 0.5, 0.05);
    const backWingMaterial = new THREE.MeshLambertMaterial({ color: 0x193519 });
    const backWing = new THREE.Mesh(backWingGeo, backWingMaterial);

    this.airplane.add(aboveWing);
    this.airplane.add(belowWing);
    this.airplane.add(backWing);

    aboveWing.rotateX((90 * Math.PI) / 180);
    aboveWing.position.set(0, 0.35, 0.5);
    belowWing.rotateX((90 * Math.PI) / 180);
    belowWing.position.set(0, -0.4, 0.5);
    backWing.rotateX((90 * Math.PI) / 180);
    backWing.position.set(0, 0.25, -1.5);

    this.airplane.rotateY((100 * Math.PI) / 100);

    this.airplane.position.set(0, 0.5, 0);

    scene.add(this.airplane);
  }

  //ICG Classes
  _onDocumentKeyDown(event) {
    switch (event.key) {
      case "ArrowLeft":
        if (this.airplane.position.x != -4) {
          this.airplane.position.x -= 1;
        }
        break;
      case "ArrowRight":
        if (this.airplane.position.x != 4) {
          this.airplane.position.x += 1;
        }
        break;
      case "ArrowUp":
        if (this.airplane.position.y != 2.5) {
          this.airplane.position.y += 1;
        }
        break;
      case "ArrowDown":
        if (this.airplane.position.y != 0.5) {
          this.airplane.position.y -= 1;
        }
        break;
      case "Enter":
        this.camera.position.set(0, 3, 4);
        this.camera.lookAt(new THREE.Vector3(0, 1.5, 0)); // Set look at coordinate like this

        break;
      case "Escape":
        this.levelUp.style.display = "none";
        this._restartGame(true);
        break;

      default:
        return;
    }
  }

  _initializeScene(scene, camera, replay) {
    //things where gettinh one on top of other when restart
    if (!replay) {
      //create the scene
      this._ilumination(scene);
      this._createField(scene);

      //create obstacules and lifes
      this.objects = new THREE.Group();
      scene.add(this.objects);

      this._makePlane(scene);

      for (let index = 0; index < 10; index++) {
        this._spawnObstacules();
      }

      for (let index = 0; index < 5; index++) {
        this._spawnLife();
      }

      camera.rotateX((-20 * Math.PI) / 180);
      camera.position.set(0, 3, 4);
    } else {
      this.objects.traverse((item) => {
        if (item instanceof THREE.Mesh) {
          if (item.userData.type == "obstacule") {
            this._configObstacule(
              item,
              this.airplane.position.x,
              -this.objects.position.z
            );
          } else {
            this._configLife(
              item,
              this.airplane.position.x,
              -this.objects.position.z
            );
          }
        } else {
          item.position.set(0, 0, 0);
        }
      });
      this.camera.position.set(0, 3, 4);
      this.camera.lookAt(new THREE.Vector3(0, 1.5, 0)); // Set look at coordinate like this
    }
  }
}
