# AI-Powered Prep - Quick Reference

## Setup (One-time)

```bash
# Choose your provider and get an API key:
export OPENAI_API_KEY="sk-your-key-here"     # OpenAI (recommended)
export ANTHROPIC_API_KEY="sk-ant-your-key"   # Anthropic Claude  
export GOOGLE_API_KEY="your-google-key"      # Google Gemini
```

**Get API Keys:**
- [OpenAI](https://platform.openai.com) - Most comprehensive
- [Anthropic](https://console.anthropic.com) - Great for workflows
- [Google AI](https://makersuite.google.com/app/apikey) - Free tier available

## Commands

```bash
# Basic AI generation (choose provider interactively)
dev prep --ai

# Use specific provider
dev prep --ai --provider openai
dev prep --ai --provider anthropic  
dev prep --ai --provider google

# Force manual mode (no AI)
dev prep --interactive

# Overwrite existing dev.yml
dev prep --ai --force
```

## What AI Generates

✅ **Complete dev.yml** with proper setup steps  
✅ **Environment variables** from .env files and docs  
✅ **Dependencies** and proper step ordering  
✅ **Database setup** commands  
✅ **Package manager** auto-detection  
✅ **Build/test** commands from scripts  
✅ **Post-setup** instructions  

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to obtain API key" | Check: `echo $OPENAI_API_KEY` |
| "AI analysis failed" | Try different provider or `--interactive` |
| "Invalid provider" | Use: `openai`, `anthropic`, or `google` |
| "Network timeout" | Check internet, try again |

## Example Output

```yaml
project_name: "My App"
version: "1"

environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      default: "postgresql://localhost:5432/myapp"

setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"
    
  - name: "Start Database"  
    type: "shell"
    command: "docker-compose up -d"
    
  - name: "Run Migrations"
    type: "shell" 
    command: "npm run db:migrate"
    depends_on: ["Start Database"]
```

## Cost

- **OpenAI**: ~$0.01-0.03 per generation
- **Anthropic**: Similar to OpenAI
- **Google AI**: Free tier available

## Privacy

🔒 API keys stored securely  
🔒 Project data not retained  
🔒 One-time analysis only  
🔒 Full transparency - review all output  

---

📖 **[Full Documentation](ai-setup-guide.md)** | 🐛 **[Report Issues](https://github.com/justinloveless/devlift/issues)** 