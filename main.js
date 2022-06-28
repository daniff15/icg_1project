window.onload = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);

  //GET ORBIT CONTROLS FILE FROM https://gist.github.com/jonathanlurie/bcedf6153a33ec64ab0f7c45e4e6fb70
  var controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 1.0;
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  const game = new Game(scene, camera);

  function animate() {
    requestAnimationFrame(animate);
    game.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", onResize, false);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
};
