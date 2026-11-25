mod commands;
mod rf;

use std::{env, process::ExitCode};

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    let json = args.iter().any(|a| a == "--json");
    let res = match args.get(1).map(String::as_str) {
        Some("link-budget") => commands::run_link(&args, json),
        Some("array") => commands::run_array(&args, json),
        Some("fresnel") => commands::run_fresnel(&args, json),
        _ => Err("usage: wavefield <link-budget|array|fresnel> [options] [--json]".into()),
    };
    match res {
        Ok(s) => {
            println!("{s}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}
