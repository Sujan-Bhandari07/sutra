import { BadRequestException, Controller, Inject, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClientProxy } from "@nestjs/microservices";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { firstValueFrom } from "rxjs";
import { Authreq, JwtGuard } from "../guard/auth.guard";
import { RateLimitGuard } from "../guard/rate-limit.guard";

const MAX_BYTES = 50 * 1024 * 1024;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const uploadRoot = () => path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"));

@Controller("uploads")
@UseGuards(JwtGuard)
export class UploadController {
  constructor(@Inject("AGENTS_SERVICE") private readonly agents: ClientProxy) {}

  @Post()
  @UseGuards(JwtGuard, RateLimitGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(@UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer }, @Req() req: Authreq) {
    if (!file) throw new BadRequestException("Choose an image to upload");
    if (file.size > MAX_BYTES || !["image/jpeg", "image/png", "video/mp4"].includes(file.mimetype)) throw new BadRequestException("Only JPEG, PNG, and MP4 media are supported (50 MB maximum)");
    if (file.mimetype !== "video/mp4" && file.size > IMAGE_MAX_BYTES) throw new BadRequestException("Images must be 10 MB or smaller");
    const jpeg = file.mimetype === "image/jpeg" && file.buffer[0] === 0xff && file.buffer[1] === 0xd8;
    const png = file.mimetype === "image/png" && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const mp4 = file.mimetype === "video/mp4" && file.buffer.subarray(4, 8).toString("ascii") === "ftyp";
    if (!jpeg && !png && !mp4) throw new BadRequestException("Media content does not match its declared type");
    const assetid = randomUUID();
    const filename = `${assetid}${jpeg ? ".jpg" : png ? ".png" : ".mp4"}`;
    await mkdir(uploadRoot(), { recursive: true });
    const destination = path.join(uploadRoot(), filename);
    await writeFile(destination, file.buffer, { flag: "wx", mode: 0o640 });
    try {
      const publicBase = process.env.PUBLIC_BASE_URL;
      if (!publicBase) throw new Error("PUBLIC_BASE_URL is not configured");
      const publicurl = new URL(`/uploads/${filename}`, publicBase).toString();
      const result = await firstValueFrom(this.agents.send("asset.register", {
        userid: req.user, assetid, filename: path.basename(file.originalname).slice(0, 180),
        contenttype: file.mimetype, size: file.size, publicurl,
      }));
      return result;
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  }
}
