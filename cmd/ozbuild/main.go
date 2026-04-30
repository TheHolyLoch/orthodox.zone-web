// Orthodox Zone - Developed by dgm at Holy Loch Media (dgm@tuta.com)
// orthodox.zone-web/cmd/ozbuild/main.go

package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/TheHolyLoch/orthodox.zone-web/internal/site"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(2)
	}

	switch os.Args[1] {
	case "build":
		buildFlags := flag.NewFlagSet("build", flag.ExitOnError)
		clean := buildFlags.Bool("clean", false, "clean public before building")
		check := buildFlags.Bool("check", false, "validate without writing output")
		if err := buildFlags.Parse(os.Args[2:]); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(2)
		}

		if err := site.Build(site.Config{
			RootDir:   ".",
			OutputDir: "public",
			Clean:     *clean,
			Check:     *check,
		}); err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
	default:
		printUsage()
		os.Exit(2)
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, "usage: ozbuild build [--clean] [--check]")
}
