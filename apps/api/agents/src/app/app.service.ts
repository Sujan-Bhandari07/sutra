import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Agent, AgentDocument } from "./schema/agents.schema";
import axios from "axios";
import { ICreateAgent, IGetAgents, success } from "@sutra/shared";
import { google } from "googleapis";
import { Model } from "mongoose";
import { oauthclient, scopes } from "./config/google.OAuth";
import {
  EStatus,
  Integration,
  IntegrationDocument,
  Providertype,
} from "./schema/integrations.schema";

export type Servicestype = "gmail" | "googlecalender" | "instagram";
@Injectable()
export class AppService {
  private INSTAGRAM_SCOPES = ["instagram_basic", "instagram_content_public"];
  constructor(
    @InjectModel(Agent.name) private readonly agentmodel: Model<AgentDocument>,
    @InjectModel(Integration.name)
    private readonly integrationmodel: Model<IntegrationDocument>,
  ) {}

  async createagent(data: ICreateAgent) {
    const agent = await this.agentmodel.create(data);
    if (!agent) {
      throw new InternalServerErrorException("Something went wrong with db");
    }
    return success("Agent created successfully.", agent);
  }

  async getagents(data: IGetAgents) {
    const agents = await this.agentmodel.find({ userid: data.userid });
    if (!agents) {
      throw new NotFoundException("You havent created a agents.");
    }
    return success("Agents found", agents);
  }

  // token = jwt of userid and purpose = "google-oauth"

  async connectgoogle(data: { _id: string }) {
    const url = oauthclient.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "concent",
      state: JSON.stringify({
        _id: data._id,
        purpose: "google-oauth",
      }),
    });
    return success("connected", url);
  }

  async connectinstagram(data: { _id: string }) {
    const state = {
      _id: data._id,
      purpose: "instagram-oauth",
    };

    const params = new URLSearchParams({
      config_id: process.env.INSTAGRAM_CONFIG_ID,
      client_id: process.env.INSTAGRAM_APP_ID,
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
      display: "popup",
      override_default_response_type: "true",
      response_type: "code",
      state: JSON.stringify(state),
      prompt: "login",
    });
    const url = `https://www.facebook.com/dialog/oauth?${params.toString()}`;

    return success("connected", url);
  }

  async googlecallback(data: { code: string; state: string; error: string }) {
    if (data.error) {
      throw new InternalServerErrorException("Something went wrong");
    }
    const st = JSON.parse(data.state);
    if (!st) {
      throw new ConflictException("Conflicted");
    }
    const { tokens } = await oauthclient.getToken(data.code);
    oauthclient.setCredentials(tokens);

    const oauth = google.oauth2({
      version: "v2",
      auth: oauthclient,
    });
    const { data: profile } = await oauth.userinfo.get();
    if (!profile.id || !profile.email) {
      throw new UnauthorizedException("not found profile");
    }

    const filters = {
      userid: st._id,
      provider: Providertype.google,
      provideraccountid: profile.id,
    };
    let connection = await this.integrationmodel
      .findOne(filters)
      .select("+tokens.accesstoken +tokens.refreshtoken");

    if (!connection) {
      connection = await this.integrationmodel.create({
        ...filters,

        tokens: {},
      });
      connection.services = [
        ...new Set<Servicestype>([
          ...connection.services,
          "gmail",
          "googlecalender",
        ]),
      ];

      connection.account = {
        ...connection.account,
        email: profile.email,
        displayname: profile.name,
      };
      connection.scopes = tokens.scope.split("");

      if (tokens.access_token) {
        connection.tokens.accesstoken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        connection.tokens.refreshtoken = tokens.refresh_token;
      }
      connection.status = EStatus.connected;
      connection.connectedat = new Date();
      await connection.save();
    }
    return {
      success: true,
    };
    // redirect from here
  }

  async instagramcallback(data: {
    code: string;
    state: string;
    error: string;
    userid: string;
  }) {
    if (data.error) {
      throw new InternalServerErrorException("Something went wrong");
    }
    const graphversion = process.env.INSTAGRAM_GRAPH_VERSION;
    const tokenreponse = await axios.get(
      `https://graph.facebook.com/${graphversion}/oauth/access_token?`,
      {
        params: {
          client_id: process.env.INSTAGRAM_APP_ID,
          redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          code: data.code,
        },
        timeout: 15000,
      },
    );
    console.log(tokenreponse);
    const assignedaccounts = await axios.get(
      `https://graph.facebook.com/${graphversion}/me/assigned_instagram_accounts`,
      {
        params: {
          fields: "id,username",
          access_token: tokenreponse.data.access_token,
        },
      },
    );
    const instagramacc = assignedaccounts.data.data;
    if (!instagramacc || instagramacc.length < 1) {
      throw new NotFoundException("Accounts not found");
    }
    const dynamicAccountId = instagramacc[0];
    const profile = await axios.get(
      `https://graph.facebook.com/${graphversion}/${dynamicAccountId}`,
      {
        params: {
          fields: {
            fields: "id,username,name",
            access_token: tokenreponse.data.access_token,
          },
        },
      },
    );

    if (!profile) {
      throw new UnauthorizedException("not found profile");
    }

    const filters = {
      userid: data.userid,
      provider: Providertype.google,
      provideraccountid: profile.data.id,
    };
    let connection = await this.integrationmodel
      .findOne(filters)
      .select("+tokens.accesstoken ");

    if (!connection) {
      connection = await this.integrationmodel.create({
        ...filters,

        tokens: {},
      });
      connection.services = [
        ...new Set<Servicestype>([...connection.services, "instagram"]),
      ];

      connection.account = {
        ...connection.account,
        username: profile.data.username,
        displayname: profile.data.name,
      };
      connection.scopes = this.INSTAGRAM_SCOPES;

      if (tokenreponse.data.access_token) {
        connection.tokens.accesstoken = tokenreponse.data.access_token;
      }
    }
    connection.status = EStatus.connected;
    connection.connectedat = new Date();
    await connection.save();

    return {
      success: true,
    };
  }
  async getintegrations(data: { _id: string }) {
  
    const integrations = await this.integrationmodel.find({userid:data._id,status:EStatus.connected})

    const instagramIntegration = integrations.find(
  (item) => item.provider === 'instagram')

  const googleIntegration = integrations.find(
  (item) => item.provider === 'google',
);

return success("integrations found",{
  integrations:{
    gmail:{
      connected:googleIntegration.services.includes("gmail")|| false,
      email:googleIntegration.account.email || null,

    },
    googlecalender:{
       connected:googleIntegration.services.includes("googlecalender")|| false,
      email:googleIntegration.account.email || null,

    },
      instagram:{
       connected:instagramIntegration.services.includes("instagram")|| false,
      email:instagramIntegration.account.username|| null,

    }
  }
})


  }
}
