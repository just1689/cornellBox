const canvas = document.getElementById("canvas");
const engine = new BABYLON.Engine(canvas, true);

let loadedPercent = 0;
const loadingScreenDiv = window.document.getElementById("loadingScreen");
let loadingScreenShowTimer = null;

function MyLoadingScreen() {
}

MyLoadingScreen.prototype.displayLoadingUI = function () {
    loadingScreenShowTimer = window.setInterval(function () {
        loadingScreenDiv.innerHTML =
            "<div class='content'>" +
            "<h1>Loading the box...<h1>" +
            "<span id='loadPercent'>(probably " + loadedPercent + "% now)</span>" +
            "</div>" +
            "<div id='kassdedi'>Originally by Vincent Lamy.</div>"
    }, 50);
};
MyLoadingScreen.prototype.hideLoadingUI = function () {
    loadingScreenDiv.style.opacity = 1;
    let loadingScreenHideTimer = window.setInterval(hideLoadingScreen, 25);

    function hideLoadingScreen() {
        if (loadingScreenDiv.style.opacity > 0) {
            loadingScreenDiv.style.opacity -= 0.05;
        }
        if (loadingScreenDiv.style.opacity <= 0) {
            loadingScreenDiv.style.opacity = 0;
            clearInterval(loadingScreenHideTimer);
            clearInterval(loadingScreenShowTimer);
            loadingScreenDiv.style.display = "none";
        }
    }
};

const loadingScreen = new MyLoadingScreen();
//Set the loading screen in the engine to replace the default one
engine.loadingScreen = loadingScreen;

const createScene = function () {

    // scene parameters
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3.White;
    const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("assets/neutral_env_EnvHDR.dds", scene);
    hdrTexture.name = "envTex";
    hdrTexture.gammaSpace = false;
    scene.createDefaultSkybox(hdrTexture, true, 1000, 0);

    // Add a camera to the scene and attach it to the canvas
    const universalCamera = new BABYLON.UniversalCamera("universalCamera", new BABYLON.Vector3(0, 1, 0), scene);
    universalCamera.speed = 0.1;
    universalCamera.fov = 1.2;
    universalCamera.minZ = 0.01;
    universalCamera.position = new BABYLON.Vector3(0, 1.5, 4);
    universalCamera.rotation = new BABYLON.Vector3(0, -3.15, 0);
    scene.activeCamera = universalCamera;
    scene.activeCamera.attachControl(canvas);

    let bjsLogo = null;

    const cornellBoxLoaded = function () {
        //lightmaps handling
        const lightmappedObjects = [
            "cornellBox.000",
            "bloc.000",
            "suzanne.000"
        ];
        for (i = 0; i < lightmappedObjects.length; i++) {
            // we create the lightmap using the mesh name
            //new Texture(url, scene, noMipmap, invertY, samplingMode, onLoad, onError, buffer, deleteBuffer, format)
            const lightmap = new BABYLON.Texture("assets/LM/" + lightmappedObjects[i] + ".LM.png", scene, false, false);
            lightmap.name = lightmappedObjects[i] + ".LM";
            // using UV2
            lightmap.coordinatesIndex = 1;
            const mesh = scene.getMeshByName(lightmappedObjects[i]);
            const meshChildren = mesh.getChildren();
            //gltf importer split multimat to children meshes
            if (!mesh || !mesh.material && (meshChildren.length === 0)) {
                //here, the mesh doesn't have material or mesh childs, we skip
                continue;
            }
            // here the root mesh is divided into one submesh per material
            if (!mesh.material && (meshChildren.length > 0)) {
                // and cycle to its childrens, and so the abstract multimaterial list
                for (j = 0; j < mesh._children.length; j++) {
                    const material = mesh._children[j].material;
                    // lightmap as shadow
                    material.lightmapTexture = lightmap;
                    material.useLightmapAsShadowmap = true;
                }
            }
            if (mesh.material) {
                // here we have one mesh with one submaterial
                // lightmap as shadow
                mesh.material.lightmapTexture = lightmap;
                mesh.material.useLightmapAsShadowmap = true;
            }
        }

        // the mesh fake-light on the ceiling
        const lightMaterial = scene.getMaterialByName("light.000");
        lightMaterial.emissiveColor = new BABYLON.Color3.White;

        // some things on the logo mesh
        bjsLogo = scene.getMeshByName("BJSlogo.000");
        bjsLogo.position.y = 1.5;
        scene.getMaterialByName("BJS-3D-logo_white.01.000").emissiveColor = new BABYLON.Color3.White;
        for (k = 0; k < bjsLogo._children.length; k++) {
            bjsLogo._children[k].material.metallic = 0.1;
            bjsLogo._children[k].material.roughness = 0;
        }
        ;
        const bjsRedMaterial = scene.getMaterialByName("BJS-3D-logo_red.01.000");
        bjsRedMaterial.metallic = 1;

        // prepare the room to receive shadows
        const cornellBox = scene.getMeshByName("cornellBox.000");
        for (k = 0; k < cornellBox._children.length; k++) {
            cornellBox._children[k].receiveShadows = true;
        }
        cornellBox.receiveShadows = true;

        // dyn light to generate shadows
        const light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 0), scene);
        light.position = new BABYLON.Vector3(0, 3, 0);

        // logo shadow
        const shadowGenerator = new BABYLON.ShadowGenerator(128, light);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.addShadowCaster(bjsLogo);

        // why not using glow?
        new BABYLON.GlowLayer("glow", scene, {
            mainTextureFixedSize: 256,
            blurKernelSize: 32
        });

        // some animations on the logo
        let frame = 0; //this will be used as a time variable

        scene.registerBeforeRender(function () {
            frame += 0.1;
            bjsLogo.rotation.x += .008;
            bjsLogo.rotation.y -= .009;
            bjsLogo.rotation.z -= .01;
            bjsRedMaterial.emissiveColor = new BABYLON.Color3((Math.cos(frame) * 0.5) + 0.5, 0, 0);
            bjsLogo.position.y = (Math.cos(frame * 0.1) * 0.15) + 1.5;
        });
    };

    //now that our cornellBoxLoaded function is written, time to load the gltf file
    const gltfLoader = BABYLON.SceneLoader.Append(
        "assets/",
        "cornellBox-PBR.gltf",
        scene,
        cornellBoxLoaded,
        function (evt) {
            if (evt.lengthComputable) {
                loadedPercent = (evt.loaded * 100 / evt.total).toFixed();
            }
            else {
                const dlCount = evt.loaded / (1024 * 1024);
                loadedPercent = Math.floor(dlCount * 100.0) / 100.0;
            }
        }
    );

    //fake white infinity skydome, to be seen above the envTex
    const falseSkydome = BABYLON.Mesh.CreateSphere("falseSkydome", 16, 20, scene);
    falseSkydome.flipFaces(true);
    falseSkydome.material = new BABYLON.PBRMaterial("falseSkydomeMtl", scene);
    falseSkydome.material.albedoColor = new BABYLON.Color3.White;
    falseSkydome.material.metallic = 0;
    falseSkydome.material.roughness = 1;
    falseSkydome.material.disableLighting = true;
    falseSkydome.material.unlit = true;

    return scene;
};

const scene = createScene();

engine.runRenderLoop(function () { // Register a render loop to repeatedly render the scene
    scene.render();
});

window.addEventListener("resize", function () { // Watch for browser/canvas resize events
    engine.resize();
});