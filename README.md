# GUI for Ceci Sun's Senior Capstone Performance (In Progress)
In Golan Levin's Fall 2023 Creative Coding course, I used p5.js to create a [gesture expander](https://youtu.be/EKIO8SaApN4?si=ccBJpT4CoezVMuKn) that rendered in real-time. The project used the via the MIT ML5 Bodypose Keypoints library. Ceci Sun, a friend and dancer at Johns Hopkins University, performed choreography to one of my favorite songs at the time, "Motion Picture Soundtrack" by Radiohead.  

![Motion Picture Soundtrack](https://de1wwae7728z6.cloudfront.net/images/tech/motion_picture_soundtrack.gif)
  
When Ceci and I caught up in Winter 2025, she asked if I would be interested in creating a new version of the project for her senior thesis performance. Given that it had been two years since we last collaborated, and newer technologies had become available, I was really excited to create an improved version.

# Web Render vs. OSC
I had two options for connecting MediaPipe to TouchDesigner. TouchDesigner's Web Render node can display a webpage as a texture, which would show the MediaPipe visualization directly. With this approach, I would receive an image as an input. The alternative was using OSC to send the numerical pose data. I decided to use OSC because it has a lower latency and the programming workflow of using variables as opposed to encoding and decoding an image felt more intuive to me. Additionally, I could create effects using placeholder values in TouchDesigner and then replace them with the OSC values later.

![02/09/26 Progress](https://github.com/suanna0/ceci-capstone/blob/main/documentation/feb-09.gif)

Check back soon for more progress :)
