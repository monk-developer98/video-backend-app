import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload the file onCloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        });
        // file has been uploaded successfully
        console.log("File is uploaded on Cloudinary",response.url);

        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)//Remove locally  saved temperary file as the upload operation gor failed
        return null
    }
}

export {uploadOnCloudinary}