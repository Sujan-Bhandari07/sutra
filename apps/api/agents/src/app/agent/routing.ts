import { TState } from "./state";

const routing =async(state:TState)=>{

    if(state.response==="generalChat"){
        return "general_chat"
    }else if(state.response==="tools_call"){
        return "tools_call"
    }else if(state.response === "email_approval"){
        return "email_approval"
    }
    else if(state.response === "instagram_approval"){
        return "instagram_approval"
    }
    else if(state.response === "calendar_approval"){
        return "calendar_approval"
    }
}

export {routing}