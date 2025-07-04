#include <common>

#define MAX_DROPS 10

struct Drop {
    vec2 position;
    float size;
    float depth;
};

uniform Drop drops[MAX_DROPS];
uniform int activeDrops;

void main() {
    vec2 cellSize = 1.0 / resolution.xy;
    vec2 uv = gl_FragCoord.xy * cellSize;

    vec4 heightmapValue = texture2D( heightmap, uv );

    // Get neighbours
    vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
    vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
    vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
    vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

    float damping = 0.985;
    float baseHeight = ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y;
    float newHeight = baseHeight * damping;

    // Multiple drop influences with individual parameters
    for(int i = 0; i < MAX_DROPS; i++) {
        if(i >= activeDrops) break;

        Drop drop = drops[i];
        float dropPhase = clamp(length(( uv - vec2( 0.5 ) ) * BOUNDS - vec2( drop.position.x, -drop.position.y ) ) * PI / drop.size, 0.0, PI );

        float dropEffect = ( cos(dropPhase) + 1.0 ) * drop.depth;
        newHeight -= dropEffect;
    }

    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = newHeight;

    gl_FragColor = heightmapValue;
}