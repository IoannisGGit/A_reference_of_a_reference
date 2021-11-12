//Style transfer on each individual frame
//based on code example static images style transfer from week 7 style transfer

//Step 1: Load all individual frames and store them in the array videoFrames

//Step 2:Load style transfer model

//Step 3: Get dimensions from videoFrames[0] (all frames have the same dimensions)

//Step 4:Create a canvas element with the retrieved dimensions

//Step 5:Apply style transfer on videoFrames[0]

//Step 6:Store styled image on videoFrames_Styled[]

//Step 7:Proceed to next image repeating steps 5 and 6 until videoFrames.length == videoFrames_Styled.length

//Step 8:When all frames have been styled begin the export process with setTimeout

//<----IMPORTANT----->
//The sequence of each step should be preserved in the right order
//The original idea of storing the styled images was changed to be done right after the styling has finished
//avoided drawing results on screen to preserve memory usage from webgl.the process can be monitored on the console
//this algorithm was made with the intention of styling high definition videos but ended up scaling down videos with ffmpeg to approximate the ml5 output
let videoFrames =[];
let frameIndex;
let numFrames= 5;   //we need to set this number according to how many frames we have exported with ffmpeg
let frameW, frameH;
let myCanvas,graphics;
let exportTimer = 3000; //timer between exports
let style;

let buffers =[];
let buffersize;
let count;
let numCols,numRows;
let dimW, dimH;

function loadVideoFrames(){
  
  // Load all individual frames and store them in the array videoFrames
  for(let i=0; i<numFrames-1; i++){
    let index = i+1; //frames begin from number 001 so we are correcting by  using an index +1 
    if(i<9){
        let img = loadImage(`videoFrames/Dreams_frames/out-00${index}.jpg`);
        videoFrames[i]=img;
    }
    else if(i>=9 && i<99){
        let img = loadImage(`videoFrames/Dreams_frames/out-0${index}.jpg`);
        videoFrames[i]=img;
    }
    else{
        let img = loadImage(`videoFrames/Dreams_frames/out-${index}.jpg`);
        videoFrames[i]=img;
   } 

  }

  //create a callback and a promise for the last image to ensure all previous images have been loaded(in order to avoid doing it for every single image)
  return new Promise((resolve,reject)=>{
    let lastImg = loadImage('videoFrames/Dreams_frames/out-408.jpg', ()=>{
      frameW = videoFrames[0].width;
      frameH = videoFrames[0].height;
      graphics =createGraphics(frameW,frameH);
      console.log("All frames are loaded");
      createBuffers(frameW,frameH);
      resolve();
    });

    videoFrames.push(lastImg);
  });
  
}

function loadTransferStyle(){
  return new Promise((resolve,reject)=>{
    style =ml5.styleTransfer("models/VanGogh_Model_ml5", ()=>{
      console.log("model is loaded");
      resolve()
    });
  });
}


//we dont need preload function as we are using asynchronous calls to make sure each step is done in order
async function setup(){
  pixelDensity(1);
  await loadVideoFrames();
  await loadTransferStyle();
  
  //applying style transfer to each individual frame
  //in case our program crashes after a number of frames we can set the frameindex to the last saved output and continue from there
  frameIndex =0;
   while(frameIndex<numFrames){
    await transferStyle(frameIndex);
    await exportFrames(frameIndex);
    frameIndex++;
  }

}

function transferStyle(index){
  let tempImg = videoFrames[index];
  graphics.image(tempImg, 0, 0, frameW, frameH);
  fillBuffers(graphics);
  return new Promise((resolve,reject)=>{  
    for(let i=0; i<buffers.length;i++){
    style.transfer(buffers[i], (err, result)=> {
      let tempDOMImage = createImg(result.src).hide();
      let img = tempDOMImage;
      buffers[i].image(img, 0, 0,buffers[i].width,buffers[i].height);
      console.log(`image ${index+1}/${videoFrames.length} has been styled`)
      
    
      });
    }
    resolve();
  });
}

function exportFrames(index){

  //export every 3 seconds to avoid clustering of browser downloading multiple files
		return new Promise((resolve,reject)=>{
      setTimeout(() => {
        let outputFile = "styled-out" + nf(index, 3) + ".jpg";
        //recompose the graphics buffer from all the slices of buffers
        for(let i=0; i<numCols;i++){
          for(let j=0; j<numRows;j++){
            let x= 200*i;
            let y= 200*j;
            let index = i + j * numCols
            graphics.image(buffers[index],x,y);
          }
        }
        save(graphics, outputFile);
        console.log("Saving styled image: " + outputFile);
        resolve();
      }, exportTimer);
    });

}
//to understand the logic behind this part of the algorithm refer to imageSplitter_Test
function createBuffers(width,height){
  numCols = Math.floor(width/200);
  numRows = Math.floor(height/200);
  buffersize = numCols * numRows;
  dimW = (width % 200) +200;
  dimH = (height % 200) +200;
  
  for(let i=0; i<buffersize-1;i++){
    let graphics;
    
    //red rectangles with dimensions 280x200 i==5 || i==11 etc
    if((i+1)%numCols ==0){
      graphics = createGraphics(dimW,200);
    //blue rectangles with dimensions 200x294 i>11 last row of rects
    }else if(i>(numCols-1)*(numRows-1)+1){
      graphics = createGraphics(200,dimH);
    //yellow rectangles with dimensions 200x200
    }else{
      graphics = createGraphics(200,200);
    }
    
    buffers.push(graphics);
  }
  //bottom right corner
  let graphics = createGraphics(dimW,dimH);
  buffers.push(graphics);
}

function fillBuffers(imageBuffer){
  for(let i=0; i<numCols;i++){
    for(let j=0; j<numRows;j++){
      let x= 200*i;
      let y= 200*j;
      let index = i + j * numCols
      
      //blue rects
      if(j==numRows-1 && i!=numCols-1){
        buffers[index].image(imageBuffer, 0, 0,200,dimH,x,y,200,dimH);
    }
    //red rects
    else if(i==numCols-1 && j!=numRows-1){
        buffers[index].image(imageBuffer, 0, 0,dimW,200,x,y,dimW,200);
    }
    //green rect
    else if(i==numCols-1 && j==numRows-1){
        buffers[index].image(imageBuffer, 0, 0,dimW,dimH,x,y,dimW,dimH);
    }
    //yellow rects
    else{
        buffers[index].image(imageBuffer, 0, 0,200,200,x,y,200,200);
    }
     
    }
  }
}

