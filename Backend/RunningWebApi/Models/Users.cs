using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace RunningWebApi.Models;

public class Users : BaseModel
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;
}