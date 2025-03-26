using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace RunningWebApi.Models;

public class Trainnings : BaseModel
{
    [Column("id")]
    public Guid Id { get; set; }

    [Column("date")]
    public DateTime Date { get; set; }

    [Column("kilometers")]
    public double Kilometers { get; set; }

    [Column("time")]
    public string Time { get; set; } = string.Empty;

    [Column("pace")]
    public string Pace { get; set; } = string.Empty;

    [Column("shoes")]
    public string Shoes { get; set; } = string.Empty;

    [Column("userid")]
    public string UserId { get; set; } = string.Empty;
}
