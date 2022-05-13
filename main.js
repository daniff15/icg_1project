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
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.rotateSpeed = 0.25;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2;

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
