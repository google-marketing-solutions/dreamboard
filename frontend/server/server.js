const { GoogleAuth } = require("google-auth-library");
const { Storage } = require("@google-cloud/storage");
require("dotenv").config({ path: __dirname + "/.env" });
const { v4: uuidv4 } = require('uuid');
const express = require("express");
const multer = require("multer");
const app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json({ limit: "200mb" }));
let ANGULAR_APP_FOLDER = "dist/dreamboard/browser";

// Change path to dev when running locally
if (process.env.ENV === "dev") {
  ANGULAR_APP_FOLDER = "dreamboard/dist/dreamboard/browser";
}
app.use(express.static(ANGULAR_APP_FOLDER));
const PORT = process.env.PORT || 3000;

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
  res.status(200).sendFile(`/`, { root: ANGULAR_APP_FOLDER });
});

app.all("/login", function (req, res) {
  res.status(200).sendFile(`/`, { root: ANGULAR_APP_FOLDER });
});

app.all("/storyboard", function (req, res) {
  res.status(200).sendFile(`/`, { root: ANGULAR_APP_FOLDER });
});

// Health check endpoint
app.get("/health_check", (req, res) => {
  res.status(200).send("OK");
});

app.post("/api/handleRequest", async (req, res) => {
  try {
    const response = await handleGetRequest(req.body.url, req.body.options);
    if (response && response.ok && response.data) {
      if (typeof response.data === "string") {
        // For requests that only return string like rewrite prompts, text extraction, etc
        // response.data should be handled in the client
        res.status(200).send({ data: response.data });
      } else {
        // Handle Python Backend errors manually to capture the actual error message
        // instead of just a generic 500 error
        if (
          response.data.error_message &&
          response.data.status_code &&
          response.data.status_code === 500
        ) {
          return res.status(500).send({ detail: response.data.error_message });
        }

        return res.status(200).send(response.data);
      }
    } else {
      res.status(500).send({
        detail:
          "ERROR. There was an issue processing the request. Please try again.",
      });
    }
  } catch (error) {
    console.log(`NodeJS handleRequest - ERROR: ${error}`);
    res.status(500).send({ detail: error.message });
  }
});

const upload = multer();
const storage = new Storage({
  projectId: process.env.PROJECT_ID,
});

function get_mtls_uri_from_gcs_uri(uri) {
  return uri.replace("gs://", "https://storage.mtls.cloud.google.com/");
}

async function getSignedUriFromGCSUri(gcsUri, blob) {
  let signedURI;
  if (process.env.ENV === "dev") {
    signedURI = get_mtls_uri_from_gcs_uri(gcsUri);
  } else {
    // Sign with Service account in PROD
    const options = {
      version: "v4", // Recommended for better security and features
      action: "read", // or 'write', 'delete'
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // URL expires in 7 days
      // For 'write' actions, you might also need contentType:
      // contentType: 'application/octet-stream',
    };
    [signedURI] = await blob.getSignedUrl(options);
  }

  return signedURI;
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
      const fileName = req.file.originalname.trim();
      console.log(
        `DreamBoard - NodeJS handleFileUploadRequest: Starting file upload ${fileName} in GCS path ${req.body.bucketPath}...`,
      );
      // Construct the full GCS path for the file.
      // workaround: replace @ with / to get the file path
      const filePath = `dreamboard/${req.body.bucketPath.replace(
        "@",
        "/",
      )}/${fileName}`;
      // Upload the file content to GCS.

      const bucket = storage.bucket(process.env.GCS_BUCKET);
      const blob = bucket.file(filePath); // Use original filename for GCS

      console.log("Creating write stream...");
      const blobStream = blob.createWriteStream({
        resumable: true, // For smaller files, resumable can be set to false
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      console.log("Setting OnError function...");
      blobStream.on("error", (err) => {
        console.error(`Error uploading file ${filePath} to GCS:`, err);
        res.status(500).send({ detail: `Error uploading file. ${filePath}` });
      });

      console.log("Setting OnFinish function...");
      blobStream.on("finish", async () => {
        // Construct the GCS URI.
        const gcsUri = `gs://${process.env.GCS_BUCKET}/${filePath}`;
        console.log(`File ${gcsUri} successfully uploaded to GCS.`);

        // Sign GCS URI to display in the frontend
        const signedURI = await getSignedUriFromGCSUri(gcsUri, blob);

        // Create an UploadedFile object with all relevant details.
        uploadedFile = {
          id: uuidv4(),
          name: fileName,
          gcs_uri: gcsUri,
          signed_uri: signedURI,
          gcs_fuse_path: "", // TODO (ae) add later. We don't need this for now
          mime_type: req.file.mimetype,
        };

        // Return uploaded file in response
        res.status(200).send(uploadedFile);
      });

      blobStream.end(req.file.buffer); // Write the file buffer to the GCS stream
    } catch (error) {
      console.log(`NodeJS handleFileUploadRequest - ERROR: ${error}`);
      res.status(500).send({ detail: error.message });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
