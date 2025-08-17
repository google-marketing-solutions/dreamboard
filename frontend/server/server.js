const { GoogleAuth } = require("google-auth-library");
require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const multer = require("multer");
const app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: "100mb" }));
let APP_FOLDER = "dist/dreamboard/browser";
// Change path to dev
if (process.env.ENV === "dev") {
  APP_FOLDER = "dreamboard/dist/dreamboard/browser";
}
app.use(express.static(APP_FOLDER));
const PORT = process.env.PORT || 8000;

async function handleGetRequest(url, options) {
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(url);
  let response;
  if (options.data) {
    response = await client.request({
      method: options.method,
      url: url,
      data: options.data,
    });
  } else {
    response = await client.fetch({
      method: options.method,
      url: url,
    });
  }
  return response;
}

// Serve Angular app
app.all("/", function (req, res) {
  res.status(200).sendFile(`/`, { root: APP_FOLDER });
});

// Health check endpoint
app.get("/health_check", (req, res) => {
  res.status(200).send("OK");
});

app.post("/api/handleRequest", async (req, res) => {
  try {
    const response = await handleGetRequest(req.body.url, req.body.options);
    if (response && response.ok) {
      if (typeof response.data === "string") {
        // For requests that only return string like rewrite prompts, text extraction, etc
        // response.data should be handled in the client
        res.status(200).send({ data: response.data });
      } else {
        res.status(200).send(response.data);
      }
    } else {
      res.status(500).send({
        detail:
          "ERROR. There was an issue processing the request. Please try again.",
      });
    }
  } catch (error) {
    res.status(500).send({ detail: error });
  }
});

const upload = multer();

async function uploadFile(filePath) {
  try {
    const blob = await storage.bucket(bucketName).upload(filePath, {
      destination: destinationPath,
      resumable: true, // Set to true for large files to enable resumable uploads
      /*gzip: true, // Optional: compress the file during upload*/
    });
    console.log(
      `${localFilePath} uploaded to ${bucketName}/${destinationFileName}`
    );
    return blob;
  } catch (err) {
    console.error(`Error uploading file: ${err}`);
  }
}

// Upload route
app.post(
  "/api/handleFileUploadRequest",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    try {
      const file_name = req.file.originalname.trim();
      console.log(
        `DreamBoard - FILE_UPLOADER_ROUTES: Starting file upload ${file_name} in GCS path ${bucket_path}...`
      );
      // Construct the full GCS path for the file.
      // workaround: replace @ with / to get the file path
      const GCS_BUCKET = `dreamboard/{bucket_path.replace("@", "/")}/{file_name}`;

      file_path = `dreamboard/${process.env.GCS_BUCKET}/${file_name}`;
      // Upload the file content to GCS.
      blob = await uploadFile(file_path);
      // Construct the GCS URI.
      const gcsBucket = `gs://${GCS_BUCKET}`;
      gcs_uri = `gs://${gcsBucket}/${blob.name}`;
      // Create an UploadedFile object with all relevant details.
      uploaded_file = {
        name: file_name,
        gcs_uri: gcs_uri,
        signed_uri: "", // TODO (ae) add later. We don't need this for now
        gcs_fuse_path: "", // TODO (ae) add later. We don't need this for now
        mime_type: file.content_type,
      };
      // Return uploaded file in response
      res.status(200).send(uploaded_file);
    } catch (error) {
      res.status(500).send({ detail: error });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
